const VideoAnalysis = {
    pollingInterval: null,
    backendUrl: '/api/v1',
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
        
        // Subscribe to player roster so we have it handy for corrections
        if (typeof PlayerService !== 'undefined') {
            PlayerService.subscribeToPlayers((players) => {
                Logger.info('Roster loaded for Video Analysis', players);
            });
        }
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
            statusText.style.color = 'var(--danger)';
            fill.style.background = 'var(--danger)';
        } else {
            statusText.style.color = 'var(--text-muted)';
            fill.style.background = 'linear-gradient(90deg, var(--brand), var(--accent))';
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
            dashboardBtn.style.color = 'var(--accent)';
            dashboardBtn.style.borderBottom = '3px solid var(--accent)';
            
            segmentsBtn.classList.remove('active');
            segmentsBtn.style.color = 'var(--text-muted)';
            segmentsBtn.style.borderBottom = '3px solid transparent';
            
            dashboardView.style.display = 'block';
            segmentsView.style.display = 'none';
        } else {
            segmentsBtn.classList.add('active');
            segmentsBtn.style.color = 'var(--accent)';
            segmentsBtn.style.borderBottom = '3px solid var(--accent)';
            
            dashboardBtn.classList.remove('active');
            dashboardBtn.style.color = 'var(--text-muted)';
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
                    <div style="color: var(--accent); font-weight: bold; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <div class="spinner-mini" style="border: 2px solid rgba(var(--accent-rgb), 0.12); border-top: 2px solid var(--accent); border-radius: 50%; width: 14px; height: 14px; animation: spin 1s linear infinite;"></div>
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
            statsGrid.innerHTML = '<div style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 20px;">Nessun dato disponibile.</div>';
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
            statsGrid.innerHTML = '<div style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 20px;">Nessuna statistica disponibile. Analizza il dettaglio delle singole azioni calde nella scheda "Azioni Rilevate" per compilare questo report.</div>';
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
                    <div class="stat-item-row" style="margin-top: 10px; border-top: 1px dashed var(--border); padding-top: 8px; font-size: 12px; color: var(--text-muted);">
                        <span>Attacchi vincenti:</span>
                        <span>${s.point_spike || 0}</span>
                    </div>
                    <div class="stat-item-row" style="font-size: 12px; color: var(--text-muted);">
                        <span>Muri vincenti:</span>
                        <span>${s.point_block || 0}</span>
                    </div>
                    <div class="stat-item-row" style="font-size: 12px; color: var(--text-muted);">
                        <span>Ace battuta:</span>
                        <span>${s.point_serve || 0}</span>
                    </div>
                    <div class="stat-item-row" style="font-size: 12px; color: var(--text-muted);">
                        <span>Errori ricezione:</span>
                        <span>${s.error_receive || 0}</span>
                    </div>
                    <div class="stat-item-row" style="font-size: 12px; color: var(--text-muted);">
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
        
        // Add manual action button at the top
        const addBtn = document.createElement('button');
        addBtn.onclick = () => this.showAddSegmentForm();
        addBtn.style.cssText = "background: rgba(var(--accent-rgb), 0.15); border: 1px dashed var(--accent); color: var(--accent); padding: 10px; margin: 10px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; text-align: center; transition: background 0.2s;";
        addBtn.onmouseover = () => addBtn.style.background = 'rgba(var(--accent-rgb), 0.25)';
        addBtn.onmouseout = () => addBtn.style.background = 'rgba(var(--accent-rgb), 0.15)';
        addBtn.innerHTML = '➕ Aggiungi Nuova Azione';
        listContainer.appendChild(addBtn);
        
        const filtered = this.getFilteredSegments();
        
        if (filtered.length === 0) {
            const noData = document.createElement('div');
            noData.style.cssText = "color: var(--text-muted); text-align: center; padding: 25px; font-size: 13px; font-style: italic;";
            noData.textContent = 'Nessuna azione trovata.';
            listContainer.appendChild(noData);
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
                    <span style="font-weight: 700; color: var(--text); font-size: 13px;">${label} #${idx + 1}</span>
                    <span style="font-size: 11px; color: var(--text-muted); flex-shrink: 0;">⏱️ ${formatTime(seg.start_time)} - ${formatTime(seg.end_time)}</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; margin-top: 2px;">
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
                <video class="highlight-video" controls autoplay preload="metadata" style="width: 100%; aspect-ratio: 16/9; border-radius: 6px; background: var(--surface-2); display: block;">
                    <source src="${this.currentVideoUrl}#t=${seg.start_time},${seg.end_time}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        } else {
            videoElement = `
                <div style="width: 100%; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 13px; background: var(--surface-2); border-radius: 6px;">
                    Video clip non disponibile
                </div>
            `;
        }
        
        const actionClass = `badge-${(seg.action_type || 'other').toLowerCase()}`;
        
        let detailsHtml = '';
        if (seg.analysis_status === 'pending') {
            detailsHtml = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px; text-align: center;">
                    <button onclick="VideoAnalysis.analyzeSegment('${this.currentJobId}', '${seg.segment_id}', '${this.currentVideoUrl}', ${seg.start_time}, ${seg.end_time}, '${seg.action_type}', this)" 
                            class="btn-ai-analysis" 
                            style="font-size: 14px; padding: 10px 20px; border-radius: 6px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; width: auto; background: linear-gradient(135deg, var(--brand), var(--accent));">
                        🔍 Avvia Analisi Statistica
                    </button>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">Usa l'IA per riconoscere i giocatori (altezza, ruolo, volto) ed estrarre i punti/errori.</p>
                </div>
            `;
        } else if (seg.analysis_status === 'processing') {
            detailsHtml = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px; color: var(--accent); font-weight: bold; font-size: 13px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px; flex-direction: column; padding: 25px 0;">
                    <div class="spinner-mini" style="border: 3px solid rgba(var(--accent-rgb), 0.12); border-top: 3px solid var(--accent); border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
                    <span>⏳ Analisi di riconoscimento in corso...</span>
                </div>
            `;
        } else if (seg.analysis_status === 'completed' && seg.details) {
            const d = seg.details;
            const badgeClass = d.is_point ? 'success' : (d.is_error ? 'error' : 'info');
            const badgeText = d.is_point ? 'Punto' : (d.is_error ? 'Errore' : 'Giocata');
            
            const isCorrected = seg.is_corrected || false;
            const correctionNotes = seg.correction_notes || '';
            const originalDetails = seg.ai_original_details;
            
            let correctedBadge = '';
            let originalDetailsHtml = '';
            if (isCorrected) {
                correctedBadge = `
                    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); color: var(--success); font-size: 11px; padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 5px; font-weight: 600; margin-bottom: 10px; width: fit-content;">
                        ✅ Corretto da Utente
                    </div>
                `;
                if (correctionNotes) {
                    correctedBadge += `
                        <div style="font-size: 12px; color: var(--success); background: rgba(16, 185, 129, 0.05); padding: 8px 12px; border-radius: 6px; border-left: 3px solid var(--success); margin-bottom: 10px; font-style: italic;">
                            <strong>Nota errore:</strong> "${correctionNotes}"
                        </div>
                    `;
                }
                
                if (originalDetails) {
                    originalDetailsHtml = `
                        <details style="margin-top: 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; padding: 10px;">
                            <summary style="font-size: 12px; color: var(--text-muted); cursor: pointer; font-weight: 600; outline: none; user-select: none;">
                                📋 Vedi Risultato Originale dell'IA
                            </summary>
                            <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px; border-top: 1px dashed var(--border); padding-top: 8px; line-height: 1.4;">
                                <div>Giocatore IA: <strong>${originalDetails.player_name || 'Sconosciuto'}</strong> (#${originalDetails.jersey_number || 'N/D'})</div>
                                <div>Esito: <strong>${originalDetails.is_point ? 'Punto' : (originalDetails.is_error ? 'Errore' : 'Giocata')}</strong></div>
                                <div style="margin-top: 4px; font-style: italic;">"${originalDetails.event_description || ''}"</div>
                            </div>
                        </details>
                    `;
                }
            }

            detailsHtml = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px; display: flex; flex-direction: column; gap: 10px; background: var(--surface-2); padding: 15px; border-radius: 6px; border: 1px solid var(--border);">
                    ${correctedBadge}
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: var(--text); font-size: 15px;">👤 Giocatore: ${d.player_name || 'Sconosciuto'}</span>
                        <span class="highlight-badge badge-${badgeClass}" style="font-size: 10px; padding: 2px 6px;">${badgeText}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 15px; flex-wrap: wrap;">
                        <span>Maglia: <strong>#${d.jersey_number || 'N/D'}</strong></span>
                        <span>Ruolo: <strong>${d.position || 'N/D'}</strong></span>
                        <span>Altezza: <strong>${d.height_cm ? d.height_cm + ' cm' : 'N/D'}</strong></span>
                    </div>
                    <div style="font-size: 13px; color: var(--text-2); border-left: 3px solid var(--accent); padding-left: 10px; font-style: italic; margin-top: 6px; line-height: 1.45;">
                        ${d.event_description || ''}
                    </div>
                    
                    ${originalDetailsHtml}

                    <div style="margin-top: 12px; display: flex; justify-content: flex-end; border-top: 1px solid var(--border); padding-top: 12px;">
                        <button onclick="VideoAnalysis.showEditSegmentForm('${seg.segment_id}')" class="btn-edit-segment" style="background: rgba(245, 158, 11, 0.1); border: 1px solid var(--warning); color: var(--warning); border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 13px; transition: all 0.2s; font-weight: 600;" onmouseover="this.style.background='rgba(245, 158, 11, 0.2)'" onmouseout="this.style.background='rgba(245, 158, 11, 0.1)'">
                            ✏️ Correggi Errore IA
                        </button>
                    </div>
                </div>
            `;
        } else if (seg.analysis_status === 'failed') {
            detailsHtml = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px; color: var(--danger); font-size: 13px; text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; padding: 15px 0;">
                    <span>❌ Analisi del segmento fallita.</span>
                    <button onclick="VideoAnalysis.analyzeSegment('${this.currentJobId}', '${seg.segment_id}', '${this.currentVideoUrl}', ${seg.start_time}, ${seg.end_time}, '${seg.action_type}', this)" 
                            class="btn-ai-analysis" 
                            style="font-size: 13px; padding: 8px 16px; border-radius: 4px; display: inline-flex; align-items: center; width: auto; background: var(--danger); cursor: pointer;">
                        🔄 Riprova Analisi
                    </button>
                </div>
            `;
        }
        
        let reasoningHtml = '';
        if (seg.analysis_reasoning) {
            reasoningHtml = `
                <div style="margin-top: 15px; background: var(--surface-2); padding: 12px; border-radius: 6px; border: 1px solid var(--surface); text-align: left;">
                    <div style="font-size: 11px; color: var(--brand); font-weight: 700; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">🔍 Log di Riconoscimento Azione (AI Reasoning)</div>
                    <div style="font-size: 12px; color: var(--text-muted); line-height: 1.45; white-space: pre-wrap;">${seg.analysis_reasoning}</div>
                </div>
            `;
        }
        
        detailContainer.innerHTML = `
            <div class="highlight-video-wrapper" style="margin-bottom: 15px;">
                ${videoElement}
            </div>
            <div class="highlight-info" style="display: flex; flex-direction: column; gap: 8px; text-align: left;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <span style="font-size: 18px; font-weight: 700; color: var(--text);">🎬 Dettaglio Azione</span>
                    <span class="highlight-badge ${actionClass}" style="font-size: 11px; padding: 4px 8px;">${seg.action_type || 'Altro'}</span>
                </div>
                <div style="font-size: 14px; color: var(--text-2); line-height: 1.4;">
                    ${seg.description || 'Nessuna descrizione.'}
                </div>
                <div style="font-size: 11px; color: var(--text-muted);">
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
        detailContainer.style.color = 'var(--text-muted)';
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
    },

    showEditSegmentForm: function(segmentId) {
        const seg = this.currentSegments.find(s => s.segment_id === segmentId);
        if (!seg) return;
        
        const detailsContainer = document.getElementById('detailPanelContent');
        if (!detailsContainer) return;
        
        const d = seg.details || {
            player_name: '',
            player_id: '',
            jersey_number: '',
            position: '',
            action_type: seg.action_type || 'other',
            is_point: false,
            is_error: false,
            action_details: {},
            event_description: seg.description || ''
        };
        
        // Load player options
        let playerOptions = '<option value="">-- Persona Sconosciuta / Non in lista --</option>';
        if (typeof PlayerService !== 'undefined') {
            const players = PlayerService.getPlayersList();
            players.forEach(p => {
                const isSelected = p.id === d.player_id ? 'selected' : '';
                playerOptions += `<option value="${p.id}" ${isSelected}>${p.number ? '#' + p.number + ' - ' : ''}${p.name} (${p.role || ''})</option>`;
            });
        }
        
        // Determine active outcome
        let outcomeVal = 'neutral';
        if (d.is_point) outcomeVal = 'point';
        else if (d.is_error) outcomeVal = 'error';
        
        // Determine active statistic
        let activeStat = 'none';
        if (d.action_details) {
            for (const [k, v] of Object.entries(d.action_details)) {
                if (v === 1) {
                    activeStat = k;
                    break;
                }
            }
        }
        
        const editFormHtml = `
            <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px; text-align: left; background: var(--surface-2); padding: 20px; border-radius: 8px; border: 1px solid var(--accent); display: flex; flex-direction: column; gap: 15px;">
                <h3 style="color: var(--accent); font-size: 16px; margin: 0 0 5px 0; display: flex; align-items: center; gap: 8px;">✏️ Correggi Rilevazione & Risultati (Azione #${this.currentSegments.indexOf(seg) + 1})</h3>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">⏱️ Tempo Inizio (Secondi)</label>
                        <input type="number" id="editStartTime" step="0.1" min="0" value="${seg.start_time.toFixed(1)}" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                    </div>
                    
                    <div style="flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">⏱️ Tempo Fine (Secondi)</label>
                        <input type="number" id="editEndTime" step="0.1" min="0" value="${seg.end_time.toFixed(1)}" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                    </div>
                </div>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">👤 Giocatore Effettivo</label>
                        <select id="editPlayerId" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                            ${playerOptions}
                        </select>
                    </div>
                    
                    <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">🏐 Categoria Azione</label>
                        <select id="editActionType" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                            <option value="serve" ${d.action_type === 'serve' ? 'selected' : ''}>🏐 Battuta</option>
                            <option value="attack" ${d.action_type === 'attack' ? 'selected' : ''}>💥 Attacco</option>
                            <option value="defense" ${d.action_type === 'defense' ? 'selected' : ''}>🛡️ Difesa</option>
                            <option value="block" ${d.action_type === 'block' ? 'selected' : ''}>🧱 Muro</option>
                            <option value="other" ${d.action_type === 'other' ? 'selected' : ''}>Altro</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">📊 Esito Giocata</label>
                        <select id="editOutcome" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                            <option value="neutral" ${outcomeVal === 'neutral' ? 'selected' : ''}>Giocata Neutra / Altro</option>
                            <option value="point" ${outcomeVal === 'point' ? 'selected' : ''}>Punto per Noi</option>
                            <option value="error" ${outcomeVal === 'error' ? 'selected' : ''}>Errore nostro (Punto avversari)</option>
                        </select>
                    </div>

                    <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">📈 Statistica Specifica</label>
                        <select id="editStat" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                            <option value="none" ${activeStat === 'none' ? 'selected' : ''}>Nessuna statistica</option>
                            <optgroup label="Punti">
                                <option value="point_spike" ${activeStat === 'point_spike' ? 'selected' : ''}>Attacco Vincente (Spike)</option>
                                <option value="point_block" ${activeStat === 'point_block' ? 'selected' : ''}>Muro Vincente</option>
                                <option value="point_serve" ${activeStat === 'point_serve' ? 'selected' : ''}>Ace Servizio</option>
                                <option value="point_lob" ${activeStat === 'point_lob' ? 'selected' : ''}>Pallonetto/Cassonetto (Lob)</option>
                                <option value="point_random" ${activeStat === 'point_random' ? 'selected' : ''}>Altro Punto</option>
                            </optgroup>
                            <optgroup label="Errori">
                                <option value="service_out" ${activeStat === 'service_out' ? 'selected' : ''}>Battuta Fuori</option>
                                <option value="service_net" ${activeStat === 'service_net' ? 'selected' : ''}>Battuta in Rete</option>
                                <option value="error_receive" ${activeStat === 'error_receive' ? 'selected' : ''}>Errore Ricezione</option>
                                <option value="error_defense" ${activeStat === 'error_defense' ? 'selected' : ''}>Errore Difesa</option>
                                <option value="error_set" ${activeStat === 'error_set' ? 'selected' : ''}>Errore Alzata</option>
                                <option value="error_block" ${activeStat === 'error_block' ? 'selected' : ''}>Errore Muro</option>
                                <option value="foul" ${activeStat === 'foul' ? 'selected' : ''}>Fallo (Rete, Doppia, Quattro Tocchi)</option>
                                <option value="error_grave" ${activeStat === 'error_grave' ? 'selected' : ''}>Errore Grave / Generico</option>
                            </optgroup>
                        </select>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">📝 Descrizione Azione (Italiano)</label>
                    <textarea id="editEventDescription" rows="2" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none; resize: vertical; font-family: inherit;">${d.event_description || ''}</textarea>
                </div>

                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label style="font-size: 12px; color: var(--success); font-weight: 600; display: flex; align-items: center; gap: 5px;">💡 Segnala Errore / Nota Correzione <small style="color: var(--text-muted); font-weight: normal;">(Es. confuso n. 4 col n. 9)</small></label>
                    <textarea id="editCorrectionNotes" rows="2" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--success); border-radius: 6px; color: var(--text); font-size: 13px; outline: none; resize: vertical; font-family: inherit;" placeholder="Spiega brevemente cosa ha sbagliato l'IA (es: 'ha confuso Luca con Marco a causa del capello simile' o 'ha ignorato il tocco del muro'). Questo aiuterà a calibrare i futuri modelli.">${seg.correction_notes || ''}</textarea>
                </div>

                <div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 5px; flex-wrap: wrap;">
                    <button onclick="VideoAnalysis.deleteSegment('${segmentId}')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); color: var(--danger); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.3)';" onmouseout="this.style.background='rgba(239, 68, 68, 0.15)';">🗑️ Elimina Azione</button>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="VideoAnalysis.selectSegment('${segmentId}')" style="background: none; border: 1px solid var(--border); color: var(--text-muted); padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.color='var(--text)'; this.style.borderColor='var(--text-muted)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';">Annulla</button>
                        <button onclick="VideoAnalysis.saveSegmentCorrection('${segmentId}')" style="background: linear-gradient(135deg, var(--success), var(--success)); border: none; color: #ffffff; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transition: all 0.2s;" onmouseover="this.style.opacity='0.9';" onmouseout="this.style.opacity='1';">Salva Modifiche</button>
                    </div>
                </div>
            </div>
        `;
        
        const highlightInfo = detailsContainer.querySelector('.highlight-info');
        if (highlightInfo) {
            const youtubeId = this.getYouTubeId(this.currentVideoUrl);
            let videoElement = '';
            const startSec = Math.floor(seg.start_time);
            const endSec = Math.ceil(seg.end_time);
            
            if (youtubeId) {
                videoElement = `
                    <iframe class="highlight-video" 
                        src="https://www.youtube.com/embed/${youtubeId}?start=${startSec}&end=${endSec}&rel=0&modestbranding=1" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        style="width: 100%; aspect-ratio: 16/9; border-radius: 6px; display: block;">
                    </iframe>
                `;
            } else if (this.currentVideoUrl) {
                videoElement = `
                    <video class="highlight-video" controls style="width: 100%; aspect-ratio: 16/9; border-radius: 6px; background: var(--surface-2); display: block;">
                        <source src="${this.currentVideoUrl}#t=${seg.start_time},${seg.end_time}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                `;
            }
            
            const actionClass = `badge-${(seg.action_type || 'other').toLowerCase()}`;
            
            detailsContainer.innerHTML = `
                <div class="highlight-video-wrapper" style="margin-bottom: 15px;">
                    ${videoElement}
                </div>
                <div class="highlight-info" style="display: flex; flex-direction: column; gap: 8px; text-align: left;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <span style="font-size: 18px; font-weight: 700; color: var(--text);">🎬 Dettaglio Azione</span>
                        <span class="highlight-badge ${actionClass}" style="font-size: 11px; padding: 4px 8px;">${seg.action_type || 'Altro'}</span>
                    </div>
                    <div style="font-size: 14px; color: var(--text-2); line-height: 1.4;">
                        ${seg.description || 'Nessuna descrizione.'}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">
                        ⏱️ Timing originale nel video: ${seg.start_time.toFixed(1)}s - ${seg.end_time.toFixed(1)}s (Durata: ${(seg.end_time - seg.start_time).toFixed(1)}s)
                    </div>
                    ${editFormHtml}
                </div>
            `;
        }
    },

    saveSegmentCorrection: async function(segmentId) {
        const segIndex = this.currentSegments.findIndex(s => s.segment_id === segmentId);
        if (segIndex === -1) return;
        
        const seg = this.currentSegments[segIndex];
        
        const playerId = document.getElementById('editPlayerId').value;
        const actionType = document.getElementById('editActionType').value;
        const outcome = document.getElementById('editOutcome').value;
        const stat = document.getElementById('editStat').value;
        const eventDesc = document.getElementById('editEventDescription').value;
        const notes = document.getElementById('editCorrectionNotes').value;
        
        const startTime = parseFloat(document.getElementById('editStartTime').value);
        const endTime = parseFloat(document.getElementById('editEndTime').value);
        
        if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
            alert('Inserisci tempi di inizio e fine validi (il tempo d\'inizio deve essere minore di quello di fine).');
            return;
        }
        
        // Backup original segments list if not already backed up
        const dbPathJob = `/jobs/${this.currentJobId}/result`;
        try {
            let jobResult = await FirebaseService.read(dbPathJob);
            if (jobResult && !jobResult.ai_original_segments) {
                await FirebaseService.update(dbPathJob, {
                    ai_original_segments: JSON.parse(JSON.stringify(jobResult.segments || []))
                });
            }
        } catch (err) {
            Logger.warning("Could not backup original segments:", err);
        }
        
        let name = 'Sconosciuto';
        let jersey = '';
        let pos = '';
        let height = '';
        
        if (playerId && playerId !== 'unknown' && typeof PlayerService !== 'undefined') {
            const players = PlayerService.getPlayersList();
            const found = players.find(p => p.id === playerId);
            if (found) {
                name = found.name;
                jersey = found.number || '';
                pos = found.role || '';
                height = found.height || '';
            }
        }
        
        const actionDetails = {
            point_serve: 0, point_spike: 0, point_block: 0, point_lob: 0, point_random: 0,
            service_out: 0, service_net: 0, foul: 0, error_grave: 0, error_block: 0,
            error_receive: 0, error_set: 0, error_defense: 0
        };
        if (stat && stat !== 'none' && actionDetails.hasOwnProperty(stat)) {
            actionDetails[stat] = 1;
        }
        
        if (!seg.ai_original_details) {
            seg.ai_original_details = JSON.parse(JSON.stringify(seg.details || {}));
        }
        
        const updatedDetails = {
            player_id: playerId || '',
            player_name: name,
            jersey_number: jersey,
            position: pos,
            height_cm: height,
            action_type: actionType,
            is_point: outcome === 'point',
            is_error: outcome === 'error',
            action_details: actionDetails,
            event_description: eventDesc
        };
        
        seg.details = updatedDetails;
        seg.is_corrected = true;
        seg.correction_notes = notes;
        seg.corrected_at = new Date().toISOString();
        seg.action_type = actionType;
        seg.start_time = startTime;
        seg.end_time = endTime;
        
        // Sort chronologically
        this.currentSegments.sort((a, b) => a.start_time - b.start_time);
        
        try {
            const success = await FirebaseService.write(`/jobs/${this.currentJobId}/result/segments`, this.currentSegments);
            
            if (success) {
                Logger.success(`Segment ${segmentId} correction saved successfully!`);
                alert('Modifiche salvate con successo!');
                
                const result = { segments: this.currentSegments };
                this.renderResults(result, this.currentVideoUrl, this.currentJobId);
            } else {
                throw new Error('Firebase write failed');
            }
        } catch (error) {
            Logger.error('Failed to save segment correction:', error);
            alert('Errore nel salvataggio su Firebase.');
        }
    },

    showAddSegmentForm: function() {
        const detailsContainer = document.getElementById('detailPanelContent');
        if (!detailsContainer) return;
        
        const items = document.querySelectorAll('.segment-list-item');
        items.forEach(item => item.classList.remove('selected'));
        this.selectedSegmentId = null;
        
        detailsContainer.style.justifyContent = 'flex-start';
        detailsContainer.style.alignItems = 'stretch';
        
        let playerOptions = '<option value="">-- Persona Sconosciuta / Non in lista --</option>';
        if (typeof PlayerService !== 'undefined') {
            const players = PlayerService.getPlayersList();
            players.forEach(p => {
                playerOptions += `<option value="${p.id}">${p.number ? '#' + p.number + ' - ' : ''}${p.name} (${p.role || ''})</option>`;
            });
        }
        
        const addFormHtml = `
            <div style="background: var(--surface-2); padding: 20px; border-radius: 8px; border: 1px solid var(--accent); display: flex; flex-direction: column; gap: 15px; text-align: left;">
                <h3 style="color: var(--accent); font-size: 16px; margin: 0; display: flex; align-items: center; gap: 8px;">➕ Aggiungi Nuova Azione Manualmente</h3>
                
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">⏱️ Tempo Inizio (Secondi)</label>
                        <input type="number" id="addStartTime" step="0.1" min="0" value="0.0" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                    </div>
                    
                    <div style="flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">⏱️ Tempo Fine (Secondi)</label>
                        <input type="number" id="addEndTime" step="0.1" min="0" value="5.0" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                    </div>

                    <div style="flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 5px;">
                        <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">🏐 Categoria Azione</label>
                        <select id="addActionType" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                            <option value="serve">🏐 Battuta</option>
                            <option value="attack">💥 Attacco</option>
                            <option value="defense">🛡️ Difesa</option>
                            <option value="block">🧱 Muro</option>
                            <option value="other">Altro</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">📝 Descrizione Rilevamento Segmentazione (es: 'Servizio fuori')</label>
                    <textarea id="addDescription" rows="2" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none; resize: vertical; font-family: inherit;"></textarea>
                </div>

                <div style="border-top: 1px dashed var(--border); padding-top: 10px; margin-top: 5px; display: flex; flex-direction: column; gap: 15px;">
                    <h4 style="color: var(--text-2); font-size: 14px; margin: 0;">📊 Dettagli Statistici (Opzionale)</h4>
                    
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">👤 Giocatore Effettivo</label>
                            <select id="addPlayerId" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                                ${playerOptions}
                            </select>
                        </div>
                        
                        <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">📊 Esito Giocata</label>
                            <select id="addOutcome" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                                <option value="neutral">Giocata Neutra / Altro</option>
                                <option value="point">Punto per Noi</option>
                                <option value="error">Errore nostro (Punto avversari)</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">📈 Statistica Specifica</label>
                            <select id="addStat" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none;">
                                <option value="none">Nessuna statistica</option>
                                <optgroup label="Punti">
                                    <option value="point_spike">Attacco Vincente (Spike)</option>
                                    <option value="point_block">Muro Vincente</option>
                                    <option value="point_serve">Ace Servizio</option>
                                    <option value="point_lob">Pallonetto/Cassonetto (Lob)</option>
                                    <option value="point_random">Altro Punto</option>
                                </optgroup>
                                <optgroup label="Errori">
                                    <option value="service_out">Battuta Fuori</option>
                                    <option value="service_net">Battuta in Rete</option>
                                    <option value="error_receive">Errore Ricezione</option>
                                    <option value="error_defense">Errore Difesa</option>
                                    <option value="error_set">Errore Alzata</option>
                                    <option value="error_block">Errore Muro</option>
                                    <option value="foul">Fallo (Rete, Doppia, Quattro Tocchi)</option>
                                    <option value="error_grave">Errore Grave / Generico</option>
                                </optgroup>
                            </select>
                        </div>

                        <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-size: 12px; color: var(--text-muted); font-weight: 600;">📝 Descrizione Alzata/Attacco (Dettaglio)</label>
                            <textarea id="addEventDescription" rows="1" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none; resize: vertical; font-family: inherit;"></textarea>
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label style="font-size: 12px; color: var(--success); font-weight: 600;">💡 Nota Aggiunta Manuale / Errore IA</label>
                    <textarea id="addCorrectionNotes" rows="2" style="width: 100%; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--success); border-radius: 6px; color: var(--text); font-size: 13px; outline: none; resize: vertical; font-family: inherit;" placeholder="Spiega perché stai aggiungendo questa azione manualmente (es: 'l'IA ha mancato questa battuta' o 'la segmentazione automatica l'ha esclusa')."></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 5px;">
                    <button onclick="window.location.reload()" style="background: none; border: 1px solid var(--border); color: var(--text-muted); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.color='var(--text)'; this.style.borderColor='var(--text-muted)';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border)';">Annulla</button>
                    <button onclick="VideoAnalysis.saveNewSegment()" style="background: linear-gradient(135deg, var(--brand), var(--accent)); border: none; color: #ffffff; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transition: all 0.2s;" onmouseover="this.style.opacity='0.9';" onmouseout="this.style.opacity='1';">Salva Nuova Azione</button>
                </div>
            </div>
        `;
        
        detailsContainer.innerHTML = addFormHtml;
    },

    saveNewSegment: async function() {
        if (!this.currentJobId) {
            alert('Nessun job attivo.');
            return;
        }
        
        const startTime = parseFloat(document.getElementById('addStartTime').value);
        const endTime = parseFloat(document.getElementById('addEndTime').value);
        const actionType = document.getElementById('addActionType').value;
        const desc = document.getElementById('addDescription').value;
        
        const playerId = document.getElementById('addPlayerId').value;
        const outcome = document.getElementById('addOutcome').value;
        const stat = document.getElementById('addStat').value;
        const eventDesc = document.getElementById('addEventDescription').value;
        const notes = document.getElementById('addCorrectionNotes').value;
        
        if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
            alert('Inserisci tempi di inizio e fine validi (il tempo d\'inizio deve essere minore di quello di fine).');
            return;
        }
        
        const dbPathJob = `/jobs/${this.currentJobId}/result`;
        try {
            let jobResult = await FirebaseService.read(dbPathJob);
            if (jobResult && !jobResult.ai_original_segments) {
                await FirebaseService.update(dbPathJob, {
                    ai_original_segments: JSON.parse(JSON.stringify(jobResult.segments || []))
                });
            }
        } catch (err) {
            Logger.warning("Could not backup original segments:", err);
        }
        
        let details = null;
        let analysisStatus = 'pending';
        if (playerId || outcome !== 'neutral' || stat !== 'none' || eventDesc) {
            let name = 'Sconosciuto';
            let jersey = '';
            let pos = '';
            let height = '';
            
            if (playerId && typeof PlayerService !== 'undefined') {
                const players = PlayerService.getPlayersList();
                const found = players.find(p => p.id === playerId);
                if (found) {
                    name = found.name;
                    jersey = found.number || '';
                    pos = found.role || '';
                    height = found.height || '';
                }
            }
            
            const actionDetails = {
                point_serve: 0, point_spike: 0, point_block: 0, point_lob: 0, point_random: 0,
                service_out: 0, service_net: 0, foul: 0, error_grave: 0, error_block: 0,
                error_receive: 0, error_set: 0, error_defense: 0
            };
            if (stat !== 'none') actionDetails[stat] = 1;
            
            details = {
                player_id: playerId || '',
                player_name: name,
                jersey_number: jersey,
                position: pos,
                height_cm: height,
                action_type: actionType,
                is_point: outcome === 'point',
                is_error: outcome === 'error',
                action_details: actionDetails,
                event_description: eventDesc || desc
            };
            analysisStatus = 'completed';
        }
        
        const newSeg = {
            segment_id: 'seg_manual_' + Date.now(),
            start_time: startTime,
            end_time: endTime,
            action_type: actionType,
            description: desc || 'Inserito manualmente.',
            analysis_status: analysisStatus,
            details: details,
            is_corrected: true,
            is_manually_added: true,
            correction_notes: notes || 'Aggiunto manualmente.',
            corrected_at: new Date().toISOString()
        };
        
        this.currentSegments.push(newSeg);
        this.currentSegments.sort((a, b) => a.start_time - b.start_time);
        
        try {
            const success = await FirebaseService.write(`/jobs/${this.currentJobId}/result/segments`, this.currentSegments);
            if (success) {
                alert('Nuovo segmento aggiunto con successo!');
                const result = { segments: this.currentSegments };
                this.renderResults(result, this.currentVideoUrl, this.currentJobId);
            } else {
                throw new Error('Salvataggio fallito.');
            }
        } catch (error) {
            Logger.error('Errore durante l\'aggiunta del segmento:', error);
            alert('Impossibile salvare il nuovo segmento.');
        }
    },

    deleteSegment: async function(segmentId) {
        if (!confirm('Sei sicuro di voler eliminare questa azione dalla rilevazione?')) return;
        
        const segIndex = this.currentSegments.findIndex(s => s.segment_id === segmentId);
        if (segIndex === -1) return;
        
        const dbPathJob = `/jobs/${this.currentJobId}/result`;
        try {
            let jobResult = await FirebaseService.read(dbPathJob);
            if (jobResult && !jobResult.ai_original_segments) {
                await FirebaseService.update(dbPathJob, {
                    ai_original_segments: JSON.parse(JSON.stringify(jobResult.segments || []))
                });
            }
        } catch (err) {
            Logger.warning("Could not backup original segments:", err);
        }
        
        this.currentSegments.splice(segIndex, 1);
        
        try {
            const success = await FirebaseService.write(`/jobs/${this.currentJobId}/result/segments`, this.currentSegments);
            if (success) {
                alert('Azione eliminata con successo!');
                const result = { segments: this.currentSegments };
                this.renderResults(result, this.currentVideoUrl, this.currentJobId);
            } else {
                throw new Error('Delete write failed');
            }
        } catch (error) {
            Logger.error('Failed to delete segment:', error);
            alert('Impossibile eliminare l\'azione.');
        }
    },

    exportSegmentationDataset: async function() {
        if (!this.currentJobId) {
            alert('Nessuna analisi attiva selezionata.');
            return;
        }
        
        try {
            const allJobs = await FirebaseService.read('/jobs');
            const dataset = [];
            
            if (allJobs) {
                Object.entries(allJobs).forEach(([jobId, jobData]) => {
                    if (jobData && jobData.result && jobData.result.ai_original_segments) {
                        dataset.push({
                            job_id: jobId,
                            video_url: jobData.video_url || '',
                            custom_name: jobData.custom_name || '',
                            ai_original_segments: jobData.result.ai_original_segments,
                            user_corrected_segments: jobData.result.segments.map(seg => ({
                                segment_id: seg.segment_id,
                                start_time: seg.start_time,
                                end_time: seg.end_time,
                                action_type: seg.action_type,
                                description: seg.description,
                                is_manually_added: seg.is_manually_added || false,
                                is_corrected: seg.is_corrected || false,
                                correction_notes: seg.correction_notes || ''
                            }))
                        });
                    }
                });
            }
            
            if (dataset.length === 0) {
                const dbPathJob = `/jobs/${this.currentJobId}/result`;
                let jobResult = await FirebaseService.read(dbPathJob);
                if (jobResult && jobResult.ai_original_segments) {
                    dataset.push({
                        job_id: this.currentJobId,
                        video_url: this.currentVideoUrl || '',
                        ai_original_segments: jobResult.ai_original_segments,
                        user_corrected_segments: this.currentSegments.map(seg => ({
                            segment_id: seg.segment_id,
                            start_time: seg.start_time,
                            end_time: seg.end_time,
                            action_type: seg.action_type,
                            description: seg.description,
                            is_manually_added: seg.is_manually_added || false,
                            is_corrected: seg.is_corrected || false,
                            correction_notes: seg.correction_notes || ''
                        }))
                    });
                }
            }
            
            if (dataset.length === 0) {
                alert('Non ci sono ancora correzioni alla segmentazione (es. modifiche ai tempi, aggiunte o rimozioni di azioni) per generare questo dataset.');
                return;
            }
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `volley_ai_segmentation_tuning_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            
            Logger.success(`Exported ${dataset.length} segmentation tuning pairs.`);
        } catch (error) {
            Logger.error('Failed to export segmentation dataset:', error);
            alert('Si è verificato un errore durante l\'esportazione del dataset.');
        }
    },

    exportDetailedAnalysisDataset: async function() {
        if (!this.currentJobId) {
            alert('Nessuna analisi attiva selezionata.');
            return;
        }
        
        try {
            const allJobs = await FirebaseService.read('/jobs');
            const dataset = [];
            
            if (allJobs) {
                Object.entries(allJobs).forEach(([jobId, jobData]) => {
                    if (jobData && jobData.result && jobData.result.segments) {
                        jobData.result.segments.forEach((seg, index) => {
                            if (seg.is_corrected && seg.ai_original_details) {
                                dataset.push({
                                    job_id: jobId,
                                    video_url: jobData.video_url || '',
                                    custom_name: jobData.custom_name || '',
                                    segment_index: index,
                                    segment_id: seg.segment_id || '',
                                    action_type: seg.action_type || '',
                                    start_time: seg.start_time || 0,
                                    end_time: seg.end_time || 0,
                                    description: seg.description || '',
                                    ai_original_details: seg.ai_original_details,
                                    user_corrected_details: seg.details,
                                    correction_notes: seg.correction_notes || '',
                                    corrected_at: seg.corrected_at || ''
                                });
                            }
                        });
                    }
                });
            }
            
            if (dataset.length === 0) {
                this.currentSegments.forEach((seg, index) => {
                    if (seg.is_corrected && seg.ai_original_details) {
                        dataset.push({
                            job_id: this.currentJobId,
                            video_url: this.currentVideoUrl || '',
                            segment_index: index,
                            segment_id: seg.segment_id || '',
                            action_type: seg.action_type || '',
                            start_time: seg.start_time || 0,
                            end_time: seg.end_time || 0,
                            description: seg.description || '',
                            ai_original_output: seg.ai_original_details,
                            user_corrected_output: seg.details,
                            correction_notes: seg.correction_notes || '',
                            corrected_at: seg.corrected_at || ''
                        });
                    }
                });
            }
            
            if (dataset.length === 0) {
                alert('Non ci sono ancora correzioni dettagliate salvate per generare questo dataset.');
                return;
            }
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `volley_ai_detailed_analysis_tuning_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            
            Logger.success(`Exported ${dataset.length} detailed analysis tuning pairs.`);
        } catch (error) {
            Logger.error('Failed to export detailed analysis dataset:', error);
            alert('Si è verificato un errore durante l\'esportazione del dataset.');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    VideoAnalysis.init();
});
