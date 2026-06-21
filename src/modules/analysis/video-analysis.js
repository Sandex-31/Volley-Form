const VideoAnalysis = {
    pollingInterval: null,
    backendUrl: 'http://127.0.0.1:8000/api/v1',
    // UI State variables for Master-Detail navigation
    currentSegments: [],
    selectedSegmentId: null,
    activeFilterType: 'all',
    searchQuery: '',
    currentJobId: '',
    currentVideoUrl: '',

    init: async function() {
        Logger.info('Initializing Video Analysis module');
        await this.loadMatches();
        await this.loadPastAnalyses();
        this.setupPastAnalysisListener();
    },

    loadPastAnalyses: async function() {
        const select = document.getElementById('pastAnalysisSelect');
        if (!select) return;
        select.innerHTML = '<option value="">-- Select a completed analysis to review --</option>';
        
        try {
            const response = await fetch(`${this.backendUrl}/history`);
            if (!response.ok) throw new Error('Failed to fetch job history');
            
            const completedJobs = await response.json();
            if (!completedJobs || completedJobs.length === 0) {
                select.innerHTML = '<option value="">-- No past completed analyses found --</option>';
                return;
            }
            
            // Sort completed jobs in reverse alphabetical order of their job_id (which approximate chronological order for our UUIDs)
            completedJobs.sort((a, b) => b.job_id.localeCompare(a.job_id));
            
            completedJobs.forEach(job => {
                const option = document.createElement('option');
                option.value = job.job_id;
                
                // Get a friendly name for the video
                let videoName = job.custom_name || '';
                if (!videoName) {
                    const ytId = this.getYouTubeId(job.video_url);
                    if (ytId) {
                        videoName = `YouTube (${ytId})`;
                    } else if (job.video_url) {
                        const parts = job.video_url.split('/');
                        videoName = parts[parts.length - 1] || job.video_url;
                    } else {
                        videoName = 'Unknown video';
                    }
                }
                
                const detailStr = job.details || 'Analysis complete';
                option.textContent = `${videoName} - ${detailStr}`;
                select.appendChild(option);
            });
        } catch (error) {
            Logger.error('Failed to load past analyses', error);
            select.innerHTML = '<option value="">-- Error loading past analyses --</option>';
        }
    },

    setupPastAnalysisListener: function() {
        const pastSelect = document.getElementById('pastAnalysisSelect');
        if (pastSelect) {
            pastSelect.addEventListener('change', async (e) => {
                const jobId = e.target.value;
                if (!jobId) return;
                
                try {
                    // Update UI state
                    const btn = document.getElementById('startAnalysisBtn');
                    const originalBtnText = btn.textContent;
                    btn.disabled = true;
                    btn.textContent = '⏳ Loading Past Analysis...';
                    
                    const response = await fetch(`${this.backendUrl}/status/${jobId}`);
                    if (!response.ok) throw new Error('Failed to fetch job status');
                    
                    const jobData = await response.json();
                    if (jobData && jobData.result) {
                        // Reset form state/loading button
                        btn.disabled = false;
                        btn.textContent = originalBtnText;

                        // Hide progress and form card
                        document.getElementById('aiAnalysisForm').style.display = 'none';
                        document.getElementById('analysisProgressContainer').style.display = 'none';
                        
                        // Show and render dashboard results
                        document.getElementById('analysisResultsContainer').style.display = 'block';
                        this.renderResults(jobData.result, jobData.video_url, jobId);
                    } else {
                        alert('Could not retrieve results for this job.');
                        btn.disabled = false;
                        btn.textContent = originalBtnText;
                    }
                } catch (error) {
                    Logger.error('Error loading past job:', error);
                    alert('Error loading past job.');
                    const btn = document.getElementById('startAnalysisBtn');
                    btn.disabled = false;
                    btn.textContent = '🚀 Start AI Analysis';
                }
            });
        }
    },

    loadMatches: async function() {
        const select = document.getElementById('matchSelect');
        select.innerHTML = '<option value="">-- None / Training Session --</option>';
        try {
            const matches = await MatchService.getAllMatches();
            
            if (matches.length === 0) {
                return;
            }

            // Sort matches by date descending
            matches.sort((a, b) => new Date(b.date) - new Date(a.date));

            matches.forEach(match => {
                const option = document.createElement('option');
                option.value = match.id;
                option.textContent = `${match.date} - vs ${match.opponent} (${match.location})`;
                select.appendChild(option);
            });
        } catch (error) {
            Logger.error('Failed to load matches for video analysis', error);
            const errorOption = document.createElement('option');
            errorOption.value = "";
            errorOption.disabled = true;
            errorOption.textContent = 'Error loading matches list';
            select.appendChild(errorOption);
        }
    },

    startAnalysis: async function(event) {
        event.preventDefault();
        
        const videoUrl = document.getElementById('videoLink').value;
        const matchId = document.getElementById('matchSelect').value;
        const customName = document.getElementById('customName') ? document.getElementById('customName').value : '';
        
        if (!videoUrl) {
            alert('Please provide a video URL.');
            return;
        }

        // Update UI state
        const btn = document.getElementById('startAnalysisBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Submitting Job...';

        document.getElementById('analysisProgressContainer').style.display = 'block';
        this.updateProgressUI(0, 'Sending request to AI backend...');

        try {
            // POST request to backend
            const response = await fetch(`${this.backendUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    match_id: matchId || null,
                    video_url: videoUrl,
                    custom_name: customName || null
                })
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();
            Logger.info('Analysis job submitted:', data);
            
            // Start polling the status
            this.pollStatus(data.job_id);

        } catch (error) {
            Logger.error('Error submitting analysis job', error);
            alert('Failed to connect to the AI Backend. Is the server running?');
            btn.disabled = false;
            btn.textContent = '🚀 Start AI Analysis';
            this.updateProgressUI(0, 'Failed to connect.', true);
        }
    },

    pollStatus: function(jobId) {
        const btn = document.getElementById('startAnalysisBtn');
        btn.textContent = '⏳ Processing...';

        // Poll every 2 seconds
        this.pollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.backendUrl}/status/${jobId}`);
                if (!response.ok) throw new Error('Status fetch failed');

                const data = await response.json();
                
                // Show the detailed progress status message if available
                const displayDetails = data.details || data.status || 'Processing...';

                if (data.status === 'completed') {
                    clearInterval(this.pollingInterval);
                    btn.textContent = '✅ Analysis Complete';
                    this.updateProgressUI(100, displayDetails, false);
                    
                    // Hide progress and form card
                    document.getElementById('aiAnalysisForm').style.display = 'none';
                    document.getElementById('analysisProgressContainer').style.display = 'none';
                    
                    // Show and render dashboard results
                    document.getElementById('analysisResultsContainer').style.display = 'block';
                    VideoAnalysis.renderResults(data.result, data.video_url, jobId);
                } else if (data.status === 'failed') {
                    clearInterval(this.pollingInterval);
                    btn.disabled = false;
                    btn.textContent = '🚀 Retry Analysis';
                    this.updateProgressUI(0, displayDetails, true);
                } else {
                    this.updateProgressUI(data.progress || 0, displayDetails, false);
                }

            } catch (error) {
                Logger.error('Error polling status', error);
                // Don't kill the interval on first network error, just let it retry
            }
        }, 2000);
    },

    updateProgressUI: function(percentage, text, isError = false) {
        const fill = document.getElementById('progressBarFill');
        const percentageText = document.getElementById('progressPercentage');
        const statusText = document.getElementById('progressStatusText');

        fill.style.width = `${percentage}%`;
        percentageText.textContent = `${percentage}%`;
        statusText.textContent = text;

        if (isError) {
            statusText.style.color = '#ef4444';
            fill.style.background = '#ef4444';
        } else {
            statusText.style.color = '#8892b0';
            fill.style.background = 'linear-gradient(90deg, #5b7cfa, #7c3aed)';
        }
    },

    getYouTubeId: function(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    },

    switchTab: function(tabId) {
        const dashboardBtn = document.getElementById('tabBtnDashboard');
        const segmentsBtn = document.getElementById('tabBtnSegments');
        const dashboardView = document.getElementById('dashboardView');
        const segmentsView = document.getElementById('segmentsView');
        
        if (!dashboardBtn || !segmentsBtn || !dashboardView || !segmentsView) return;
        
        if (tabId === 'dashboard') {
            dashboardBtn.classList.add('active');
            dashboardBtn.style.color = '#a78bfa';
            dashboardBtn.style.borderBottom = '3px solid #7c3aed';
            
            segmentsBtn.classList.remove('active');
            segmentsBtn.style.color = '#8892b0';
            segmentsBtn.style.borderBottom = '3px solid transparent';
            
            dashboardView.style.display = 'block';
            segmentsView.style.display = 'none';
        } else {
            segmentsBtn.classList.add('active');
            segmentsBtn.style.color = '#a78bfa';
            segmentsBtn.style.borderBottom = '3px solid #7c3aed';
            
            dashboardBtn.classList.remove('active');
            dashboardBtn.style.color = '#8892b0';
            dashboardBtn.style.borderBottom = '3px solid transparent';
            
            dashboardView.style.display = 'none';
            segmentsView.style.display = 'block';
        }
    },

    analyzeSegment: async function(jobId, segmentId, videoUrl, startTime, endTime, actionType, btn) {
        if (!jobId || !segmentId) return;
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Analisi in corso...';
            const parent = btn.parentElement;
            if (parent) {
                parent.innerHTML = `
                    <div style="color: #a78bfa; font-weight: bold; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <div class="spinner-mini" style="border: 2px solid rgba(167, 139, 250, 0.1); border-top: 2px solid #a78bfa; border-radius: 50%; width: 14px; height: 14px; animation: spin 1s linear infinite;"></div>
                        ⏳ Analisi statistica in corso...
                    </div>
                `;
            }
        }
        
        try {
            const response = await fetch(`${this.backendUrl}/analyze/segment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    segment_id: segmentId,
                    video_url: videoUrl,
                    start_time: startTime,
                    end_time: endTime,
                    action_type: actionType
                })
            });
            
            if (!response.ok) throw new Error('Fallito avvio analisi del segmento');
            Logger.info(`Segment ${segmentId} analysis started`);
        } catch (error) {
            Logger.error('Errore analisi segmento:', error);
            alert('Impossibile avviare l\'analisi per questa azione.');
            const select = document.getElementById('pastAnalysisSelect');
            if (select && select.value) {
                select.dispatchEvent(new Event('change'));
            }
        }
    },

    renderResults: function(result, videoUrl, jobId) {
        Logger.info('Rendering analysis results:', result, 'Video URL:', videoUrl, 'Job ID:', jobId);
        
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;
        
        statsGrid.innerHTML = '';
        
        if (!result || !result.segments) {
            statsGrid.innerHTML = '<div style="color: #a0aec0; grid-column: 1/-1; text-align: center; padding: 20px;">Nessun dato disponibile.</div>';
            return;
        }
        
        const segments = result.segments || [];
        
        // Save to state variables
        this.currentSegments = segments;
        this.currentVideoUrl = videoUrl;
        this.currentJobId = jobId;
        
        // 1. Dynamic Statistics Aggregation from completed segments
        const aggregatedStats = {};
        segments.forEach(seg => {
            if (seg.analysis_status === 'completed' && seg.details) {
                const det = seg.details;
                const pId = det.player_id || 'unknown';
                if (!aggregatedStats[pId]) {
                    aggregatedStats[pId] = {
                        player_name: det.player_name || 'Giocatore Sconosciuto',
                        jersey_number: det.jersey_number || '',
                        position: det.position || '',
                        stats: {
                            point_serve: 0,
                            point_spike: 0,
                            point_block: 0,
                            point_lob: 0,
                            point_random: 0,
                            service_out: 0,
                            service_net: 0,
                            foul: 0,
                            error_grave: 0,
                            error_block: 0,
                            error_receive: 0,
                            error_set: 0,
                            error_defense: 0
                        }
                    };
                }
                
                const statsToSum = det.action_details || {};
                const currentStats = aggregatedStats[pId].stats;
                Object.keys(currentStats).forEach(key => {
                    currentStats[key] += (statsToSum[key] || 0);
                });
            }
        });
        
        const statsPlayers = Object.values(aggregatedStats);
        if (statsPlayers.length === 0) {
            statsGrid.innerHTML = '<div style="color: #a0aec0; grid-column: 1/-1; text-align: center; padding: 20px;">Nessuna statistica disponibile. Analizza il dettaglio delle singole azioni calde nella scheda "Azioni Rilevate" per compilare questo report.</div>';
        } else {
            statsPlayers.forEach(p => {
                const s = p.stats;
                const points = (s.point_serve || 0) + (s.point_spike || 0) + (s.point_block || 0) + (s.point_lob || 0) + (s.point_random || 0);
                const errors = (s.error_grave || 0) + (s.error_block || 0) + (s.error_receive || 0) + (s.error_set || 0) + (s.error_defense || 0) + (s.service_out || 0) + (s.service_net || 0);
                
                const card = document.createElement('div');
                card.className = 'player-stat-card';
                card.innerHTML = `
                    <div class="player-card-header">
                        <div class="player-card-name">👤 ${p.player_name}</div>
                        <div class="player-card-meta">#${p.jersey_number} • ${p.position || 'Giocatore'}</div>
                    </div>
                    <div class="stat-item-row">
                        <span>Punti Totali:</span>
                        <span class="stat-item-val success">${points}</span>
                    </div>
                    <div class="stat-item-row">
                        <span>Errori Totali:</span>
                        <span class="stat-item-val error">${errors}</span>
                    </div>
                    <div class="stat-item-row" style="margin-top: 10px; border-top: 1px dashed #2a3449; padding-top: 8px; font-size: 12px; color: #718096;">
                        <span>Attacchi vincenti:</span>
                        <span>${s.point_spike || 0}</span>
                    </div>
                    <div class="stat-item-row" style="font-size: 12px; color: #718096;">
                        <span>Muri vincenti:</span>
                        <span>${s.point_block || 0}</span>
                    </div>
                    <div class="stat-item-row" style="font-size: 12px; color: #718096;">
                        <span>Ace battuta:</span>
                        <span>${s.point_serve || 0}</span>
                    </div>
                    <div class="stat-item-row" style="font-size: 12px; color: #718096;">
                        <span>Errori ricezione:</span>
                        <span>${s.error_receive || 0}</span>
                    </div>
                    <div class="stat-item-row" style="font-size: 12px; color: #718096;">
                        <span>Errori difesa:</span>
                        <span>${s.error_defense || 0}</span>
                    </div>
                `;
                statsGrid.appendChild(card);
            });
        }
        
        // 2. Render Master Panel List
        this.renderMasterList();
        
        // 3. Automatically select the first visible segment
        const visible = this.getFilteredSegments();
        if (visible.length > 0) {
            // Re-select currently active segment if it is still visible, otherwise select first
            const activeExists = visible.find(s => s.segment_id === this.selectedSegmentId);
            this.selectSegment(activeExists ? this.selectedSegmentId : visible[0].segment_id);
        } else {
            this.renderDetailPanelEmpty();
        }
    },

    getFilteredSegments: function() {
        const query = this.searchQuery.toLowerCase().trim();
        return this.currentSegments.filter(seg => {
            // Filter by Action Type
            if (this.activeFilterType !== 'all') {
                if ((seg.action_type || '').toLowerCase() !== this.activeFilterType) {
                    return false;
                }
            }
            // Filter by Search Query
            if (query !== '') {
                const desc = (seg.description || '').toLowerCase();
                const reasoning = (seg.analysis_reasoning || '').toLowerCase();
                const details = seg.details ? JSON.stringify(seg.details).toLowerCase() : '';
                if (!desc.includes(query) && !reasoning.includes(query) && !details.includes(query)) {
                    return false;
                }
            }
            return true;
        });
    },

    renderMasterList: function() {
        const listContainer = document.getElementById('masterPanelList');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        const filtered = this.getFilteredSegments();
        
        if (filtered.length === 0) {
            listContainer.innerHTML = '<div style="color: #8892b0; text-align: center; padding: 25px; font-size: 13px; font-style: italic;">Nessuna azione trovata.</div>';
            return;
        }
        
        filtered.forEach((seg, idx) => {
            const item = document.createElement('div');
            item.className = `segment-list-item ${seg.segment_id === this.selectedSegmentId ? 'selected' : ''}`;
            item.setAttribute('data-id', seg.segment_id);
            item.onclick = () => this.selectSegment(seg.segment_id);
            
            // Format timestamps into MM:SS
            const formatTime = (secs) => {
                const m = Math.floor(secs / 60);
                const s = Math.floor(secs % 60);
                return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            };
            
            // Resolve action label/translation
            const actionLabels = {
                serve: '🏐 Battuta',
                attack: '💥 Attacco',
                defense: '🛡️ Difesa',
                block: '🧱 Muro',
                other: '🎬 Altro'
            };
            const label = actionLabels[seg.action_type] || '🎬 Azione';
            
            // Resolve status indicator
            const statusLabels = {
                pending: '<span class="status-badge pending">Da Analizzare</span>',
                processing: '<span class="status-badge processing">In Corso</span>',
                completed: '<span class="status-badge completed">Completata</span>',
                failed: '<span class="status-badge failed">Fallita</span>'
            };
            const statusHtml = statusLabels[seg.analysis_status] || '';
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <span style="font-weight: 700; color: #f0f4f8; font-size: 13px;">${label} #${idx + 1}</span>
                    <span style="font-size: 11px; color: #8892b0; flex-shrink: 0;">⏱️ ${formatTime(seg.start_time)} - ${formatTime(seg.end_time)}</span>
                </div>
                <div style="font-size: 11px; color: #718096; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; margin-top: 2px;">
                    ${seg.description || 'Nessuna descrizione.'}
                </div>
                <div style="margin-top: 6px; display: flex; justify-content: flex-end;">
                    ${statusHtml}
                </div>
            `;
            listContainer.appendChild(item);
        });
    },

    selectSegment: function(segmentId) {
        this.selectedSegmentId = segmentId;
        
        // Highlight active list item
        const items = document.querySelectorAll('.segment-list-item');
        items.forEach(item => {
            if (item.getAttribute('data-id') === segmentId) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        const seg = this.currentSegments.find(s => s.segment_id === segmentId);
        const detailContainer = document.getElementById('detailPanelContent');
        if (!seg || !detailContainer) return;
        
        // Reset detail panel layout styles from empty state
        detailContainer.style.justifyContent = 'flex-start';
        detailContainer.style.alignItems = 'stretch';
        detailContainer.style.color = 'inherit';
        
        const youtubeId = this.getYouTubeId(this.currentVideoUrl);
        let videoElement = '';
        const startSec = Math.floor(seg.start_time);
        const endSec = Math.ceil(seg.end_time);
        
        if (youtubeId) {
            videoElement = `
                <iframe class="highlight-video" 
                    src="https://www.youtube.com/embed/${youtubeId}?start=${startSec}&end=${endSec}&rel=0&modestbranding=1&autoplay=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="width: 100%; aspect-ratio: 16/9; border-radius: 6px; display: block;">
                </iframe>
            `;
        } else if (this.currentVideoUrl) {
            videoElement = `
                <video class="highlight-video" controls autoplay preload="metadata" style="width: 100%; aspect-ratio: 16/9; border-radius: 6px; background: #0d1117; display: block;">
                    <source src="${this.currentVideoUrl}#t=${seg.start_time},${seg.end_time}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        } else {
            videoElement = `
                <div style="width: 100%; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; color: #718096; font-size: 13px; background: #0d1117; border-radius: 6px;">
                    Video clip non disponibile
                </div>
            `;
        }
        
        const actionClass = `badge-${(seg.action_type || 'other').toLowerCase()}`;
        
        let detailsHtml = '';
        if (seg.analysis_status === 'pending') {
            detailsHtml = `
                <div style="margin-top: 15px; border-top: 1px solid #2a3449; padding-top: 15px; text-align: center;">
                    <button onclick="VideoAnalysis.analyzeSegment('${this.currentJobId}', '${seg.segment_id}', '${this.currentVideoUrl}', ${seg.start_time}, ${seg.end_time}, '${seg.action_type}', this)" 
                            class="btn-ai-analysis" 
                            style="font-size: 14px; padding: 10px 20px; border-radius: 6px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; width: auto; background: linear-gradient(135deg, #7c3aed, #5b7cfa);">
                        🔍 Avvia Analisi Statistica
                    </button>
                    <p style="font-size: 12px; color: #718096; margin-top: 8px;">Usa l'IA per riconoscere i giocatori (altezza, ruolo, volto) ed estrarre i punti/errori.</p>
                </div>
            `;
        } else if (seg.analysis_status === 'processing') {
            detailsHtml = `
                <div style="margin-top: 15px; border-top: 1px solid #2a3449; padding-top: 15px; color: #a78bfa; font-weight: bold; font-size: 13px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px; flex-direction: column; padding: 25px 0;">
                    <div class="spinner-mini" style="border: 3px solid rgba(167, 139, 250, 0.1); border-top: 3px solid #a78bfa; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
                    <span>⏳ Analisi di riconoscimento in corso...</span>
                </div>
            `;
        } else if (seg.analysis_status === 'completed' && seg.details) {
            const d = seg.details;
            const badgeClass = d.is_point ? 'success' : (d.is_error ? 'error' : 'info');
            const badgeText = d.is_point ? 'Punto' : (d.is_error ? 'Errore' : 'Giocata');
            
            detailsHtml = `
                <div style="margin-top: 15px; border-top: 1px solid #2a3449; padding-top: 15px; display: flex; flex-direction: column; gap: 10px; background: rgba(26, 31, 43, 0.5); padding: 15px; border-radius: 6px; border: 1px solid #2a3449;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: #f7fafc; font-size: 15px;">👤 Giocatore: ${d.player_name || 'Sconosciuto'}</span>
                        <span class="highlight-badge badge-${badgeClass}" style="font-size: 10px; padding: 2px 6px;">${badgeText}</span>
                    </div>
                    <div style="font-size: 12px; color: #a0aec0; display: flex; gap: 15px; flex-wrap: wrap;">
                        <span>Maglia: <strong>#${d.jersey_number || 'N/D'}</strong></span>
                        <span>Ruolo: <strong>${d.position || 'N/D'}</strong></span>
                        <span>Altezza: <strong>${d.height_cm ? d.height_cm + ' cm' : 'N/D'}</strong></span>
                    </div>
                    <div style="font-size: 13px; color: #cbd5e0; border-left: 3px solid #7c3aed; padding-left: 10px; font-style: italic; margin-top: 6px; line-height: 1.45;">
                        ${d.event_description || ''}
                    </div>
                </div>
            `;
        } else if (seg.analysis_status === 'failed') {
            detailsHtml = `
                <div style="margin-top: 15px; border-top: 1px solid #2a3449; padding-top: 15px; color: #ef4444; font-size: 13px; text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; padding: 15px 0;">
                    <span>❌ Analisi del segmento fallita.</span>
                    <button onclick="VideoAnalysis.analyzeSegment('${this.currentJobId}', '${seg.segment_id}', '${this.currentVideoUrl}', ${seg.start_time}, ${seg.end_time}, '${seg.action_type}', this)" 
                            class="btn-ai-analysis" 
                            style="font-size: 13px; padding: 8px 16px; border-radius: 4px; display: inline-flex; align-items: center; width: auto; background: #c23030; cursor: pointer;">
                        🔄 Riprova Analisi
                    </button>
                </div>
            `;
        }
        
        let reasoningHtml = '';
        if (seg.analysis_reasoning) {
            reasoningHtml = `
                <div style="margin-top: 15px; background: #131722; padding: 12px; border-radius: 6px; border: 1px solid #242d47; text-align: left;">
                    <div style="font-size: 11px; color: #5b7cfa; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">🔍 Log di Riconoscimento Azione (AI Reasoning)</div>
                    <div style="font-size: 12px; color: #8892b0; line-height: 1.45; white-space: pre-wrap;">${seg.analysis_reasoning}</div>
                </div>
            `;
        }
        
        detailContainer.innerHTML = `
            <div class="highlight-video-wrapper" style="margin-bottom: 15px;">
                ${videoElement}
            </div>
            <div class="highlight-info" style="display: flex; flex-direction: column; gap: 8px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <span style="font-size: 18px; font-weight: 700; color: #f0f4f8;">🎬 Dettaglio Azione</span>
                    <span class="highlight-badge ${actionClass}" style="font-size: 11px; padding: 4px 8px;">${seg.action_type || 'Altro'}</span>
                </div>
                <div style="font-size: 14px; color: #cbd5e0; line-height: 1.4;">
                    ${seg.description || 'Nessuna descrizione.'}
                </div>
                <div style="font-size: 11px; color: #718096;">
                    ⏱️ Timing originale nel video: ${seg.start_time.toFixed(1)}s - ${seg.end_time.toFixed(1)}s (Durata: ${(seg.end_time - seg.start_time).toFixed(1)}s)
                </div>
                ${detailsHtml}
                ${reasoningHtml}
            </div>
        `;
    },

    renderDetailPanelEmpty: function() {
        const detailContainer = document.getElementById('detailPanelContent');
        if (!detailContainer) return;
        detailContainer.style.justifyContent = 'center';
        detailContainer.style.alignItems = 'center';
        detailContainer.style.color = '#8892b0';
        detailContainer.innerHTML = `
            <div style="text-align: center;">
                <span style="font-size: 48px; display: block; margin-bottom: 15px;">🔍</span>
                Nessuna azione corrisponde ai filtri selezionati.
            </div>
        `;
    },

    setFilterType: function(type) {
        this.activeFilterType = type.toLowerCase();
        
        // Update active class on filter buttons
        const buttons = document.querySelectorAll('#segmentTypeFilters .filter-btn');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-type') === this.activeFilterType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        this.renderMasterList();
        
        // Select the first visible segment
        const visible = this.getFilteredSegments();
        if (visible.length > 0) {
            this.selectSegment(visible[0].segment_id);
        } else {
            this.renderDetailPanelEmpty();
        }
    },

    filterSegments: function() {
        const input = document.getElementById('segmentSearchInput');
        this.searchQuery = input ? input.value : '';
        this.renderMasterList();
        
        // Select the first visible segment
        const visible = this.getFilteredSegments();
        if (visible.length > 0) {
            this.selectSegment(visible[0].segment_id);
        } else {
            this.renderDetailPanelEmpty();
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    VideoAnalysis.init();
});
