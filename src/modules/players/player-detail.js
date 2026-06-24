/**
 * Player Detail Module
 * Handles loading player profile, general stats, and rendering the SetOptics dashboard.
 */

const PlayerDetailModule = {
    playerId: null,
    playerData: null,
    matchesList: [],
    
    // SetOptics mappings
    courtWidth: 800,
    courtHeight: 500,
    netX: 400,
    setterPos: { x: 280, y: 250 },
    
    targetsMap: {
        'ala_s': { name: 'Super in 4 (S)' },
        'ala_5': { name: 'Alta in 4 (5)' },
        'ala_9': { name: 'Mezza in 4 (9)' },
        'ala_c': { name: 'Corta (C)' },
        'cen_1': { name: 'Veloce Avanti (1)' },
        'cen_2': { name: 'Veloce Dietro (2)' },
        'cen_7': { name: 'Tesa Avanti (7)' },
        'cen_b': { name: 'Fast Dietro (B)' },
        'opp_4': { name: 'Alta in 2 (4)' },
        'opp_6': { name: 'Super in 2 (6)' },
        'sec_0': { name: 'Pipe (0)' },
        'sec_8': { name: 'Seconda Linea P1 (8)' }
    },

    init: async function() {
        const urlParams = new URLSearchParams(window.location.search);
        this.playerId = urlParams.get('id');

        if (!this.playerId) {
            alert("Nessun giocatore specificato.");
            window.location.href = "players.html";
            return;
        }

        // Wait for Firebase to be ready
        const checkFirebase = setInterval(async () => {
            if (FirebaseService.isReady()) {
                clearInterval(checkFirebase);
                await this.loadData();
            }
        }, 100);
    },

    loadData: async function() {
        try {
            // Load Player Profile
            const path = `${APP_CONSTANTS.FIREBASE_REFS.PLAYERS}/${this.playerId}`;
            this.playerData = await FirebaseService.read(path);
            
            if (!this.playerData) {
                alert("Giocatore non trovato.");
                window.location.href = "players.html";
                return;
            }

            // Ensure preferred sets array exists and is actually an Array
            if (!this.playerData.preferredSets) {
                this.playerData.preferredSets = [];
            } else if (!Array.isArray(this.playerData.preferredSets)) {
                this.playerData.preferredSets = Object.values(this.playerData.preferredSets);
            }

            this.renderProfileHeader();

            // Load all matches to aggregate stats
            this.matchesList = await MatchService.getAllMatches();
            await this.aggregateAndRenderStats();

            // Init 3D Engine
            if (typeof THREE !== 'undefined') {
                SetOptics3D.init('setoptics3dContainer');
            }

            // Render SetOptics Dashboard
            this.renderSetOpticsDashboard();

        } catch (error) {
            console.error("Error loading player details:", error);
        }
    },

    renderProfileHeader: function() {
        document.getElementById('detailPlayerName').textContent = this.playerData.name;
        document.getElementById('detailPlayerNumber').textContent = `#${this.playerData.number || '?'}`;
        
        // Map role code to display name
        const roleMap = {
            'p': 'Palleggiatore',
            's': 'Schiacciatore',
            'o': 'Opposto',
            'c': 'Centrale',
            'l': 'Libero'
        };
        document.getElementById('detailPlayerRole').textContent = roleMap[this.playerData.role] || this.playerData.role || 'Role';
        document.getElementById('detailPlayerHeight').textContent = `Altezza: ${this.playerData.height || '?'} cm`;

        const photoImg = document.getElementById('detailPlayerPhoto');
        const initialsDiv = document.getElementById('detailPlayerInitials');
        
        if (this.playerData.photoUrl && this.playerData.photoUrl !== 'default.jpg' && this.playerData.photoUrl !== '') {
            photoImg.src = this.playerData.photoUrl;
            photoImg.style.display = 'block';
            initialsDiv.style.display = 'none';
        } else {
            photoImg.style.display = 'none';
            initialsDiv.style.display = 'flex';
            initialsDiv.textContent = this.playerData.name ? this.playerData.name.charAt(0).toUpperCase() : '?';
        }
    },

    aggregateAndRenderStats: async function() {
        let matchesPlayed = 0;
        let totalPoints = 0;
        let totalErrors = 0;
        let totalAces = 0;

        for (const match of this.matchesList) {
            const stats = await MatchService.getMatchStats(match.id, this.playerId);
            
            // Check if player has any stats recorded in this match
            const hasStats = Object.values(stats).some(val => val > 0);
            
            if (hasStats) {
                matchesPlayed++;
                totalPoints += (stats.point_serve + stats.point_spike + stats.point_block + stats.point_lob + stats.point_random);
                totalErrors += (stats.error_grave + stats.error_block + stats.error_receive + stats.error_set + stats.error_defense + stats.foul);
                totalAces += stats.point_serve;
            }
        }

        document.getElementById('statMatchesPlayed').textContent = matchesPlayed;
        document.getElementById('statTotalPoints').textContent = totalPoints;
        document.getElementById('statTotalErrors').textContent = totalErrors;
        document.getElementById('statTotalAces').textContent = totalAces;
    },

    renderSetOpticsDashboard: function() {
        if (this.playerData.preferredSets.length === 0) {
            document.getElementById('selectedSetDetails').innerHTML = `
                <p style="color: #8892b0; font-style: italic;">Questo giocatore non ha ancora nessuna alzata preferita configurata.</p>
                <p style="color: #8892b0; font-size: 14px; margin-top: 10px;">Clicca su "Aggiungi Alzata" per iniziare.</p>
            `;
            if (typeof THREE !== 'undefined') SetOptics3D.renderSets([], this.targetsMap);
            return;
        }

        document.getElementById('selectedSetDetails').innerHTML = `
            <p style="color: #8892b0; font-style: italic;">Seleziona un'alzata dalla lista qui sotto (o dal campo se interattivo) per l'animazione 3D e i dettagli.</p>
            <div id="setList" style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;"></div>
        `;
        
        const setList = document.getElementById('setList');
        
        this.playerData.preferredSets.forEach((set, index) => {
            const targetDef = this.targetsMap[set.target];
            if (!targetDef) return;
            
            const btn = document.createElement('button');
            btn.className = 'btn-prev';
            btn.style.width = '100%';
            btn.style.textAlign = 'left';
            btn.innerHTML = `🏐 ${targetDef.name} (Apex: ${set.apex}m)`;
            btn.onclick = () => this.selectSet(index);
            setList.appendChild(btn);
        });

        // Pass to 3D engine
        if (typeof THREE !== 'undefined') {
            SetOptics3D.renderSets(this.playerData.preferredSets, this.targetsMap);
        }
    },

    selectSet: function(index) {
        const set = this.playerData.preferredSets[index];
        const targetDef = this.targetsMap[set.target];

        // Highlight in 3D
        if (typeof THREE !== 'undefined') {
            SetOptics3D.selectSet(index);
        }

        const offsetXVal = set.offsetX !== undefined ? set.offsetX : 0.0;
        const offsetYVal = set.offsetY !== undefined ? set.offsetY : 2.5;

        document.getElementById('selectedSetDetails').innerHTML = `
            <div style="background: #242d47; padding: 15px; border-radius: 8px; border: 1px solid #3a4560;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #60a5fa; margin: 0; font-size: 16px;">${targetDef.name}</h4>
                    <button onclick="PlayerDetailModule.renderSetOpticsDashboard()" 
                            style="margin-left: 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #a0aec0; padding: 4px 10px; border-radius: 6px; font-size: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;"
                            title="Torna alla Lista"
                            onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#fff';"
                            onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#a0aec0';">
                        ←
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
                    <div>
                        <span style="color: #8892b0; font-size: 10px; text-transform: uppercase; display: block;">Apex Max</span>
                        <div style="font-size: 16px; font-weight: bold; color: #f0f4f8;">${set.apex} m</div>
                    </div>
                    <div>
                        <span style="color: #8892b0; font-size: 10px; text-transform: uppercase; display: block;">Distanza Rete (Z)</span>
                        <div style="font-size: 16px; font-weight: bold; color: #f0f4f8;">${set.offset} m</div>
                    </div>
                    <div>
                        <span style="color: #8892b0; font-size: 10px; text-transform: uppercase; display: block;">Offset Orizz. (X)</span>
                        <div style="font-size: 16px; font-weight: bold; color: #f0f4f8;">${offsetXVal >= 0 ? '+' : ''}${offsetXVal} m</div>
                    </div>
                    <div>
                        <span style="color: #8892b0; font-size: 10px; text-transform: uppercase; display: block;">Altezza Impatto (Y)</span>
                        <div style="font-size: 16px; font-weight: bold; color: #f0f4f8;">${offsetYVal} m</div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button onclick="PlayerDetailModule.openEditSetModal(${index})" class="btn-primary" style="flex: 1; padding: 8px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold;">✏️ Modifica</button>
                    <button onclick="PlayerDetailModule.deleteSet(${index})" class="btn-danger" style="flex: 1; padding: 8px; border-radius: 6px; border: none; background: rgba(239, 68, 68, 0.2); color: #ef4444; cursor: pointer; font-weight: bold;">🗑️ Elimina</button>
                </div>
            </div>
        `;
    },

    openAddSetModal: function() {
        this.editingSetIndex = -1;
        document.getElementById('preferredSetForm').reset();
        document.getElementById('apexVal').textContent = '3.0m';
        document.getElementById('offsetVal').textContent = '0.5m';
        document.getElementById('offsetXValText').textContent = '+0.0m';
        document.getElementById('offsetYValText').textContent = '2.5m';
        document.getElementById('preferredSetModal').style.display = 'flex';
    },

    openEditSetModal: function(index) {
        this.editingSetIndex = index;
        const set = this.playerData.preferredSets[index];
        
        document.getElementById('setTarget').value = set.target;
        document.getElementById('setApex').value = set.apex;
        document.getElementById('apexVal').textContent = set.apex + 'm';
        document.getElementById('setOffset').value = set.offset;
        document.getElementById('offsetVal').textContent = set.offset + 'm';

        const offsetX = set.offsetX !== undefined ? set.offsetX : 0.0;
        const offsetY = set.offsetY !== undefined ? set.offsetY : 2.5;

        document.getElementById('setOffsetX').value = offsetX;
        document.getElementById('offsetXValText').textContent = (offsetX >= 0 ? '+' : '') + offsetX + 'm';
        document.getElementById('setOffsetY').value = offsetY;
        document.getElementById('offsetYValText').textContent = offsetY + 'm';
        
        document.getElementById('preferredSetModal').style.display = 'flex';
    },

    closeModal: function() {
        this.editingSetIndex = -1;
        document.getElementById('preferredSetModal').style.display = 'none';
    },

    savePreferredSet: async function(e) {
        e.preventDefault();
        
        const target = document.getElementById('setTarget').value;
        const apex = parseFloat(document.getElementById('setApex').value);
        const offset = parseFloat(document.getElementById('setOffset').value);
        const offsetX = parseFloat(document.getElementById('setOffsetX').value);
        const offsetY = parseFloat(document.getElementById('setOffsetY').value);

        if (this.editingSetIndex !== undefined && this.editingSetIndex >= 0) {
            this.playerData.preferredSets[this.editingSetIndex].target = target;
            this.playerData.preferredSets[this.editingSetIndex].apex = apex;
            this.playerData.preferredSets[this.editingSetIndex].offset = offset;
            this.playerData.preferredSets[this.editingSetIndex].offsetX = offsetX;
            this.playerData.preferredSets[this.editingSetIndex].offsetY = offsetY;
        } else {
            const newSet = {
                id: 'set_' + Date.now(),
                target,
                apex,
                offset,
                offsetX,
                offsetY
            };
            this.playerData.preferredSets.push(newSet);
        }

        // Save to Firebase
        const path = `${APP_CONSTANTS.FIREBASE_REFS.PLAYERS}/${this.playerId}/preferredSets`;
        const success = await FirebaseService.write(path, this.playerData.preferredSets);

        if (success) {
            this.closeModal();
            this.renderSetOpticsDashboard();
        } else {
            alert("Errore durante il salvataggio.");
        }
    },

    deleteSet: async function(index) {
        if (!confirm("Sei sicuro di voler eliminare questa alzata preferita?")) return;

        this.playerData.preferredSets.splice(index, 1);
        
        const path = `${APP_CONSTANTS.FIREBASE_REFS.PLAYERS}/${this.playerId}/preferredSets`;
        const success = await FirebaseService.write(path, this.playerData.preferredSets);

        if (success) {
            this.renderSetOpticsDashboard();
            document.getElementById('selectedSetDetails').innerHTML = `
                <p style="color: #8892b0; font-style: italic;">Seleziona una traiettoria dal campo per visualizzare i dettagli.</p>
            `;
        } else {
            alert("Errore durante l'eliminazione.");
        }
    }
};

// --- THREE.JS ENGINE ---
const SetOptics3D = {
    scene: null, camera: null, renderer: null, controls: null,
    courtWidth: 10, courtDepth: 10, netHeight: 2.30,
    pathsGroup: null, animationFrameId: null,
    ball: null, currentCurve: null, ballProgress: 0,
    ballTrail: [], trailGroup: null,
    BRAND: {
        bg: '#0a0a0f',
        surface: '#1a1a2e',
        surfaceLight: '#252540',
        cobalt: '#0761b2',
        accent: '#4f9cf7',
        accentDim: '#2d6bc4',
        muted: '#a0a0b8',
        court: '#14233f',
        courtLine: '#3a5680',
        net: '#cfe0f5',
        setter: '#4f9cf7',
        ball: '#ffd24a',
        arc: '#4f9cf7',
        antennaRed: '#e23b2e',
        antennaWhite: '#f2f2f2',
        pole: '#d8dde6',
    },
    
    init: function(containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = '';
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.BRAND.bg);
        this.scene.fog = new THREE.Fog(this.BRAND.bg, 16, 40);
        
        this.camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 120);
        this.camera.position.set(0, 3.1, 16);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 0, 5); // Target center of half court

        // Setup Raycaster for interactivity
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Line.threshold = 0.3;
        this.mouse = new THREE.Vector2();
        container.addEventListener('click', this.onCanvasClick.bind(this), false);

        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
        this.scene.add(ambientLight);
        
        const hemiLight = new THREE.HemisphereLight('#9ec6e8', '#0a0a0f', 0.5);
        this.scene.add(hemiLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
        dirLight.position.set(7, 13, 9);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.left = -12;
        dirLight.shadow.camera.right = 12;
        dirLight.shadow.camera.top = 12;
        dirLight.shadow.camera.bottom = -12;
        this.scene.add(dirLight);
        
        this.createEnvironment();
        
        const ballGeo = new THREE.SphereGeometry(0.14, 24, 24);
        const ballMat = new THREE.MeshStandardMaterial({ color: this.BRAND.ball, emissive: this.BRAND.ball, emissiveIntensity: 0.6 });
        this.ball = new THREE.Mesh(ballGeo, ballMat);
        this.ball.castShadow = true;
        this.ball.visible = false;
        this.scene.add(this.ball);

        this.trailGroup = new THREE.Group();
        this.scene.add(this.trailGroup);
        
        this.pathsGroup = new THREE.Group();
        this.scene.add(this.pathsGroup);
        
        window.addEventListener('resize', () => {
            if(container) {
                this.camera.aspect = container.clientWidth / container.clientHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(container.clientWidth, container.clientHeight);
            }
        });
        
        this.animate();
    },
    
    createEnvironment: function() {
        const xMin = -this.courtWidth / 2;
        const xMax = this.courtWidth / 2;
        const zMin = 0;
        const zMax = this.courtDepth;
        const attackZ = 3;
        
        const courtGeo = new THREE.PlaneGeometry(xMax - xMin, zMax);
        const courtMat = new THREE.MeshStandardMaterial({ color: this.BRAND.court, roughness: 0.95, metalness: 0 });
        const court = new THREE.Mesh(courtGeo, courtMat);
        court.rotation.x = -Math.PI / 2;
        court.position.set(0, 0, zMax / 2);
        court.receiveShadow = true;
        this.scene.add(court);

        const lineMat = new THREE.LineBasicMaterial({ color: this.BRAND.courtLine, linewidth: 2 });
        const attackMat = new THREE.LineBasicMaterial({ color: this.BRAND.courtLine, linewidth: 1.5 });
        
        const borderGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(xMin, 0.01, zMin),
            new THREE.Vector3(xMax, 0.01, zMin),
            new THREE.Vector3(xMax, 0.01, zMax),
            new THREE.Vector3(xMin, 0.01, zMax),
            new THREE.Vector3(xMin, 0.01, zMin)
        ]);
        this.scene.add(new THREE.Line(borderGeo, lineMat));
        
        const attackGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(xMin, 0.01, attackZ),
            new THREE.Vector3(xMax, 0.01, attackZ)
        ]);
        this.scene.add(new THREE.Line(attackGeo, attackMat));
        
        // Net Body
        const netWidth = 12; // 6m each side
        const netBodyGeo = new THREE.PlaneGeometry(netWidth, 1.8);
        const netBodyMat = new THREE.MeshBasicMaterial({ color: this.BRAND.net, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
        const netBody = new THREE.Mesh(netBodyGeo, netBodyMat);
        netBody.position.set(0, this.netHeight - 0.9, 0);
        this.scene.add(netBody);
        
        // Net Tape
        const netTapeGeo = new THREE.BoxGeometry(netWidth, 0.1, 0.04);
        const netTapeMat = new THREE.MeshStandardMaterial({ color: this.BRAND.net, emissive: this.BRAND.net, emissiveIntensity: 0.15 });
        const netTape = new THREE.Mesh(netTapeGeo, netTapeMat);
        netTape.position.set(0, this.netHeight, 0);
        this.scene.add(netTape);
        
        // Posts
        [-6, 6].forEach(x => {
            const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, this.netHeight, 12);
            const poleMat = new THREE.MeshStandardMaterial({ color: this.BRAND.pole, metalness: 0.3, roughness: 0.6 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(x, this.netHeight / 2, 0);
            pole.castShadow = true;
            this.scene.add(pole);
        });
        
        // Antennas
        const antennaTotal = 1.8;
        const antennaBand = 0.2;
        const antennaBandsCount = Math.round(antennaTotal / antennaBand);
        [-5, 5].forEach(x => {
            const antennaGroup = new THREE.Group();
            antennaGroup.position.set(x, 0, 0);
            for(let i=0; i<antennaBandsCount; i++) {
                const bGeo = new THREE.CylinderGeometry(0.025, 0.025, antennaBand, 10);
                const bMat = new THREE.MeshStandardMaterial({
                    color: i % 2 === 0 ? this.BRAND.antennaWhite : this.BRAND.antennaRed,
                    emissive: i % 2 === 0 ? this.BRAND.antennaWhite : this.BRAND.antennaRed,
                    emissiveIntensity: 0.18
                });
                const bMesh = new THREE.Mesh(bGeo, bMat);
                // Position so the bottom of the 1.8m antenna is 1.0m below the top of the net,
                // making it protrude exactly 0.8m above the net.
                bMesh.position.set(0, (this.netHeight - 1.0) + antennaBand * (i + 0.5), 0);
                antennaGroup.add(bMesh);
            }
            this.scene.add(antennaGroup);
        });
        
        // Setter Handle (Elegant modern pawn shape)
        const setterGroup = new THREE.Group();
        setterGroup.position.set(0, 0, 2); // default setter pos
        
        // Base
        const sBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.3, 0.1, 24),
            new THREE.MeshStandardMaterial({ color: this.BRAND.setter, roughness: 0.4 })
        );
        sBase.position.set(0, 0.05, 0);
        sBase.castShadow = true;
        setterGroup.add(sBase);

        // Body (tapered)
        const sBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.22, 1.3, 24),
            new THREE.MeshStandardMaterial({ color: this.BRAND.setter, roughness: 0.4 })
        );
        sBody.position.set(0, 0.75, 0);
        sBody.castShadow = true;
        setterGroup.add(sBody);

        // Head
        const sHead = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 24, 24),
            new THREE.MeshStandardMaterial({ color: this.BRAND.setter, roughness: 0.4 })
        );
        sHead.position.set(0, 1.5, 0);
        sHead.castShadow = true;
        setterGroup.add(sHead);
        
        this.scene.add(setterGroup);
        this.setterObj = setterGroup;
    },
    
    renderSets: function(sets, targetsMap) {
        if (!this.pathsGroup) return;
        
        while(this.pathsGroup.children.length > 0){ 
            this.pathsGroup.remove(this.pathsGroup.children[0]); 
        }
        this.ball.visible = false;
        this.currentCurve = null;
        
        // In SetOptics orientation: Net is at Z=0. Setter faces net or side.
        // X = width (-5 to 5). Z = depth (0 to 10).
        const setterPos = new THREE.Vector3(2, 2.2, 1.5); // Hand height = 2.2m
        this.setterObj.position.set(2, 0, 1.5);
        
        sets.forEach((set, index) => {
            const targetDef = targetsMap[set.target];
            if(!targetDef) return;
            
            const offsetX = parseFloat(set.offsetX !== undefined ? set.offsetX : 0.0);
            const offsetY = parseFloat(set.offsetY !== undefined ? set.offsetY : 2.5);
            const offsetZ = parseFloat(set.offset !== undefined ? set.offset : 0.5);
            
            let xPos = 0;
            let zPos = offsetZ; 
            
            switch(set.target) {
                case 'ala_s': xPos = -4; break;
                case 'ala_5': xPos = -4.5; break;
                case 'ala_9': xPos = -2; break;
                case 'ala_c': xPos = 0; break;
                case 'cen_1': xPos = 1; break;
                case 'cen_2': xPos = 3; break;
                case 'cen_7': xPos = -1.5; break;
                case 'cen_b': xPos = 4; break;
                case 'opp_4': xPos = 4; break;
                case 'opp_6': xPos = 4.5; break;
                case 'sec_0': xPos = 0; if(offsetZ < 2) zPos = 3.0; break;
                case 'sec_8': xPos = 3.5; if(offsetZ < 2) zPos = 3.0; break;
                default: xPos = 0;
            }
            
            xPos += offsetX;
            
            const targetPos = new THREE.Vector3(xPos, offsetY, zPos); 
            
            const midX = (setterPos.x + targetPos.x) / 2;
            const midZ = (setterPos.z + targetPos.z) / 2;
            
            const baseHeight = (setterPos.y * 0.25 + targetPos.y * 0.25);
            let controlY = (set.apex - baseHeight) * 2;
            if(controlY < 2) controlY = 2;
            
            const controlPos = new THREE.Vector3(midX, controlY, midZ);
            const curve = new THREE.QuadraticBezierCurve3(setterPos, controlPos, targetPos);
            
            // Draw arc line
            const points = curve.getPoints(50);
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({ color: this.BRAND.arc, linewidth: 3, transparent: true, opacity: 0.3 });
            const line = new THREE.Line(lineGeo, lineMat);
            line.userData = { index: index, curve: curve, isLine: true };
            this.pathsGroup.add(line);
            
            // Target Handle
            const targetHandleGroup = new THREE.Group();
            targetHandleGroup.userData = { index: index };
            
            const destMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 24, 24),
                new THREE.MeshStandardMaterial({ color: this.BRAND.ball, emissive: this.BRAND.ball, emissiveIntensity: 0.5 })
            );
            destMesh.position.copy(targetPos);
            destMesh.castShadow = true;
            destMesh.userData = { index: index };
            targetHandleGroup.add(destMesh);
            
            const dropLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(targetPos.x, 0, targetPos.z), targetPos]);
            const dropLine = new THREE.Line(
                dropLineGeo,
                new THREE.LineBasicMaterial({ color: this.BRAND.ball, transparent: true, opacity: 0.25 })
            );
            dropLine.userData = { index: index };
            targetHandleGroup.add(dropLine);
            
            this.pathsGroup.add(targetHandleGroup);
        });
    },
    
    selectSet: function(index) {
        if (!this.pathsGroup) return;
        
        this.pathsGroup.children.forEach(child => {
            if(child.userData && child.userData.isLine) {
                if(child.userData.index === index) {
                    child.material.opacity = 0.95;
                    this.currentCurve = child.userData.curve;
                    this.ballProgress = 0;
                    this.ball.visible = true;
                    this.ballTrail = [];
                } else {
                    child.material.opacity = 0.15;
                }
            }
        });
    },

    onCanvasClick: function(event) {
        if (!this.pathsGroup || this.pathsGroup.children.length === 0) return;
        
        const container = document.getElementById('setoptics3dContainer');
        const rect = container.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.pathsGroup.children, true);
        
        if (intersects.length > 0) {
            let selectedObj = intersects[0].object;
            let idx = undefined;
            
            // Only trigger if we clicked explicitly on a trajectory line
            if (selectedObj.userData && selectedObj.userData.isLine === true && selectedObj.userData.index !== undefined) {
                idx = selectedObj.userData.index;
            }
            
            if (idx !== undefined && typeof PlayerDetailModule !== 'undefined') {
                PlayerDetailModule.selectSet(idx);
            }
        }
    },

    animate: function() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        if (this.controls) this.controls.update();
        
        if(this.currentCurve && this.ball.visible) {
            this.ballProgress += 0.010;
            if(this.ballProgress > 1) {
                this.ballProgress = 0;
                this.ballTrail = [];
            }
            const pos = this.currentCurve.getPoint(this.ballProgress);
            this.ball.position.copy(pos);
            
            // Squash
            const squash = this.ballProgress > 0.92 ? 1 - (this.ballProgress - 0.92) * 3 : 1;
            this.ball.scale.set(1, Math.max(0.6, squash), 1);
            
            // Trail
            if (this.ballProgress === 0) {
                while(this.trailGroup.children.length > 0) this.trailGroup.remove(this.trailGroup.children[0]);
            } else {
                if (Math.random() > 0.5) {
                    const trailP = new THREE.Mesh(
                        new THREE.SphereGeometry(0.12, 8, 8),
                        new THREE.MeshBasicMaterial({ color: this.BRAND.ball, transparent: true, opacity: 0.3 })
                    );
                    trailP.position.copy(pos);
                    this.trailGroup.add(trailP);
                    this.ballTrail.push(trailP);
                }
                
                // Fade trail
                for(let i = this.ballTrail.length - 1; i >= 0; i--) {
                    const tp = this.ballTrail[i];
                    tp.material.opacity -= 0.02;
                    tp.scale.multiplyScalar(0.95);
                    if (tp.material.opacity <= 0) {
                        this.trailGroup.remove(tp);
                        this.ballTrail.splice(i, 1);
                    }
                }
            }
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    PlayerDetailModule.init();
});
