/**
 * Players Module
 * Manage user interactions and rendering for the Volleyball Player Roster
 */

const PlayersModule = {
    isAdmin: false,
    playersList: [],
    selectedPhotoFile: null,
    selectedPhotoBase64: null,
    photoAction: 'keep', // 'keep', 'update', 'remove'

    /**
     * Initialize Players Roster module
     */
    init: function() {
        // Wait for Firebase to be ready
        if (!FirebaseService.isReady()) {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.checkAdminStatus();
        this.loadRoster();
        Logger.info('Players module initialized');
    },

    /**
     * Check if admin session is active
     */
    checkAdminStatus: function() {
        this.isAdmin = StorageService.hasItem(APP_CONSTANTS.STORAGE_KEYS.ADMIN_LOGGED_IN);
        
        // Show or hide admin controls
        const adminActions = document.getElementById('playerAdminActions');
        if (adminActions) {
            adminActions.style.display = this.isAdmin ? 'flex' : 'none';
        }
    },

    /**
     * Load players list in real-time
     */
    loadRoster: function() {
        PlayerService.subscribeToPlayers((players) => {
            this.playersList = players;
            this.renderRoster(players);
        });
    },

    /**
     * Render player cards in grid
     */
    renderRoster: function(players) {
        const grid = document.getElementById('playersGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (!players || players.length === 0) {
            grid.innerHTML = '<p class="no-players">No players registered on the team roster yet.</p>';
            return;
        }

        players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';

            // Resolve role style class
            let roleClass = 'role-setter';
            const role = player.role || 'Setter';
            if (role === 'Banda') roleClass = 'role-banda';
            else if (role === 'Opposite') roleClass = 'role-opposite';
            else if (role === 'Centrale') roleClass = 'role-centrale';
            else if (role === 'Libero') roleClass = 'role-libero';

            let actionHtml = '';
            if (this.isAdmin) {
                actionHtml = `
                    <div class="player-actions">
                        <button class="btn-player-edit" onclick="PlayersModule.openEditModal('${player.id}')">Edit</button>
                        <button class="btn-player-delete" onclick="PlayersModule.deletePlayer('${player.id}', '${this.escapeQuote(player.name)}')">Delete</button>
                    </div>
                `;
            }

            // Roster profile photo display
            let photoHtml = '';
            if (player.photo_url) {
                photoHtml = `
                    <div class="player-card-photo-container">
                        <img class="player-card-photo" src="${player.photo_url}" alt="${this.escapeHtml(player.name)}">
                        <div class="player-number-badge">#${player.number}</div>
                    </div>
                `;
            } else {
                const initials = player.name ? player.name.trim().charAt(0).toUpperCase() : '?';
                photoHtml = `
                    <div class="player-card-photo-container placeholder-avatar">
                        <span class="avatar-letter">${initials}</span>
                        <div class="player-number-badge">#${player.number}</div>
                    </div>
                `;
            }

            const heightHtml = player.height ? `<div class="player-height" style="font-size: 12px; color: #8892b0; margin-top: 5px;">Altezza: ${player.height} cm</div>` : '';
            card.innerHTML = `
                ${photoHtml}
                <div class="player-name">${this.escapeHtml(player.name)}</div>
                <div class="role-badge ${roleClass}">${role}</div>
                ${heightHtml}
                ${actionHtml}
            `;
            
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-player-edit') || e.target.closest('.btn-player-delete')) {
                    return;
                }
                window.location.href = `player-detail.html?id=${player.id}`;
            });
            
            grid.appendChild(card);
        });
    },

    /**
     * Handle local player photo selection and show preview with adjustments enabled
     */
    handlePhotoSelect: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validation constraints: is image?
        if (!file.type.startsWith('image/')) {
            UIService.showMessage('✗ Please select a valid image file', 'error');
            event.target.value = '';
            return;
        }

        this.selectedPhotoFile = file;
        this.photoAction = 'update';

        // Render preview image locally (uncompressed, to let them pan/zoom)
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = document.getElementById('playerPhotoPreview');
            const placeholder = document.getElementById('playerPhotoPlaceholder');
            const btnRemove = document.getElementById('btnRemovePhoto');
            const adjustmentsDiv = document.getElementById('photoAdjustments');

            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';

                // Determine aspect ratio class
                const imgTemp = new Image();
                imgTemp.onload = () => {
                    if (imgTemp.width > imgTemp.height) {
                        previewImg.className = 'landscape';
                    } else {
                        previewImg.className = 'portrait';
                    }
                };
                imgTemp.src = e.target.result;
            }
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            if (btnRemove) {
                btnRemove.style.display = 'inline-block';
            }

            // Reset zoom & pan inputs and show adjustments panel
            this.resetPhotoAdjustments();
            if (adjustmentsDiv) {
                adjustmentsDiv.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    },

    /**
     * Update the CSS transform on the preview image based on slider values
     */
    updatePhotoTransform: function() {
        const zoom = parseFloat(document.getElementById('photoZoom').value || 1);
        const panX = parseFloat(document.getElementById('photoPanX').value || 0);
        const panY = parseFloat(document.getElementById('photoPanY').value || 0);

        const lblZoom = document.getElementById('lblPhotoZoom');
        if (lblZoom) {
            lblZoom.textContent = `${zoom.toFixed(2)}x`;
        }

        const previewImg = document.getElementById('playerPhotoPreview');
        if (previewImg) {
            // Apply scale (zoom) and translation (pan).
            // First translate(-50%, -50%) centers the absolute element, then zoom & pan relative to center.
            previewImg.style.transform = `translate(-50%, -50%) scale(${zoom}) translate(${panX}%, ${panY}%)`;
        }
    },

    /**
     * Reset crop/zoom sliders and hide panel
     */
    resetPhotoAdjustments: function() {
        const zoomSlider = document.getElementById('photoZoom');
        const panXSlider = document.getElementById('photoPanX');
        const panYSlider = document.getElementById('photoPanY');
        const lblZoom = document.getElementById('lblPhotoZoom');
        const adjustmentsDiv = document.getElementById('photoAdjustments');

        if (zoomSlider) zoomSlider.value = 1;
        if (panXSlider) panXSlider.value = 0;
        if (panYSlider) panYSlider.value = 0;
        if (lblZoom) lblZoom.textContent = '1.0x';
        
        if (adjustmentsDiv) {
            adjustmentsDiv.style.display = 'none';
        }

        const previewImg = document.getElementById('playerPhotoPreview');
        if (previewImg) {
            previewImg.style.transform = 'translate(-50%, -50%) scale(1) translate(0%, 0%)';
        }
    },

    /**
     * Helper to resize, crop, and compress image to base64 jpeg using zoom & pan factors
     */
    compressImage: function(file, maxWidth, maxHeight, quality, zoom = 1, panX = 0, panY = 0) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = maxWidth;
                    canvas.height = maxHeight;

                    const ctx = canvas.getContext('2d');
                    
                    // Clear canvas with white background (in case of transparency)
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, maxWidth, maxHeight);

                    // 1. Calculate aspect ratio to fit the image like "object-fit: cover"
                    const imgRatio = img.width / img.height;
                    const canvasRatio = maxWidth / maxHeight;
                    
                    let drawWidth, drawHeight;
                    if (imgRatio > canvasRatio) {
                        drawHeight = maxHeight;
                        drawWidth = maxHeight * imgRatio;
                    } else {
                        drawWidth = maxWidth;
                        drawHeight = maxWidth / imgRatio;
                    }

                    // 2. Apply zoom scale factor
                    const zoomedWidth = drawWidth * zoom;
                    const zoomedHeight = drawHeight * zoom;

                    // 3. Center coordinates
                    const zx = (maxWidth - zoomedWidth) / 2;
                    const zy = (maxHeight - zoomedHeight) / 2;

                    // 4. Calculate pan offsets (relative to zoomed image size)
                    const offsetX = (panX / 100) * zoomedWidth;
                    const offsetY = (panY / 100) * zoomedHeight;

                    // 5. Draw the image with translation and scaling
                    ctx.drawImage(img, zx + offsetX, zy + offsetY, zoomedWidth, zoomedHeight);

                    // Export to compressed Base64 data URL
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
                img.src = e.target.result;
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    },

    /**
     * Remove currently selected or stored profile photo visually
     */
    removeSelectedPhoto: function() {
        const photoInput = document.getElementById('playerPhotoInput');
        if (photoInput) photoInput.value = '';

        this.selectedPhotoFile = null;
        this.selectedPhotoBase64 = null;
        this.photoAction = 'remove';

        const previewImg = document.getElementById('playerPhotoPreview');
        const placeholder = document.getElementById('playerPhotoPlaceholder');
        const btnRemove = document.getElementById('btnRemovePhoto');

        if (previewImg) {
            previewImg.src = '';
            previewImg.style.display = 'none';
        }
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        if (btnRemove) {
            btnRemove.style.display = 'none';
        }

        this.resetPhotoAdjustments();
    },

    /**
     * Open player creation modal
     */
    openAddModal: function() {
        document.getElementById('playerForm').reset();
        document.getElementById('editPlayerId').value = '';
        document.getElementById('playerModalTitle').textContent = 'Add Player';
        
        // Reset photo upload state and preview
        this.removeSelectedPhoto();
        this.photoAction = 'keep'; // default is keep (no photo by default)

        const modal = document.getElementById('playerAdminModal');
        if (modal) {
            modal.classList.add('show');
        }
    },

    /**
     * Open player details editor modal
     */
    openEditModal: function(playerId) {
        const player = this.playersList.find(p => p.id === playerId);
        if (!player) return;

        document.getElementById('editPlayerId').value = player.id;
        document.getElementById('playerName').value = player.name;
        document.getElementById('playerNumber').value = player.number;
        document.getElementById('playerHeight').value = player.height || '';
        document.getElementById('playerRole').value = player.role;
        document.getElementById('playerModalTitle').textContent = 'Edit Player Details';

        // Set photo state and preview
        this.selectedPhotoFile = null;
        this.selectedPhotoBase64 = null;
        this.photoAction = 'keep';

        const previewImg = document.getElementById('playerPhotoPreview');
        const placeholder = document.getElementById('playerPhotoPlaceholder');
        const btnRemove = document.getElementById('btnRemovePhoto');

        this.resetPhotoAdjustments();

        if (player.photo_url) {
            if (previewImg) {
                previewImg.src = player.photo_url;
                previewImg.style.display = 'block';

                // Determine aspect ratio class for existing photo URL
                const imgTemp = new Image();
                imgTemp.onload = () => {
                    if (imgTemp.width > imgTemp.height) {
                        previewImg.className = 'landscape';
                    } else {
                        previewImg.className = 'portrait';
                    }
                };
                imgTemp.src = player.photo_url;
            }
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            if (btnRemove) {
                btnRemove.style.display = 'inline-block';
            }
        } else {
            if (previewImg) {
                previewImg.className = '';
                previewImg.src = '';
                previewImg.style.display = 'none';
            }
            if (placeholder) {
                placeholder.style.display = 'block';
            }
            if (btnRemove) {
                btnRemove.style.display = 'none';
            }
        }

        const modal = document.getElementById('playerAdminModal');
        if (modal) {
            modal.classList.add('show');
        }
    },

    /**
     * Close player creation/edit modal
     */
    closeModal: function() {
        const modal = document.getElementById('playerAdminModal');
        if (modal) {
            modal.classList.remove('show');
        }
        document.getElementById('playerForm').reset();
        document.getElementById('editPlayerId').value = '';
        this.removeSelectedPhoto();
    },

    /**
     * Save/Create player, saving base64 photo locally to database with zoom & pan applied
     */
    handleFormSubmit: async function(event) {
        event.preventDefault();

        const id = document.getElementById('editPlayerId').value;
        const name = document.getElementById('playerName').value.trim();
        const number = document.getElementById('playerNumber').value;
        const heightVal = document.getElementById('playerHeight').value;
        const role = document.getElementById('playerRole').value;

        if (!name || !number || !role) {
            UIService.showMessage('Please fill in all fields', 'error');
            return;
        }

        const saveBtn = document.querySelector('#playerForm button[type="submit"]');
        const originalBtnText = saveBtn ? saveBtn.textContent : 'Save Player';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        try {
            const playerId = id || 'player_' + Date.now();
            const height = heightVal ? parseInt(heightVal) : null;
            const playerData = {
                id: playerId,
                name,
                number: parseInt(number),
                role,
                height
            };

            // Retrieve existing player to check for previous photos
            const existingPlayer = id ? this.playersList.find(p => p.id === id) : null;
            let currentPhotoUrl = existingPlayer ? (existingPlayer.photo_url || '') : '';

            // Handle photo url based on actions
            if (this.photoAction === 'remove') {
                playerData.photo_url = '';
            } else if (this.photoAction === 'update' && this.selectedPhotoFile) {
                // Read adjustments values on submit
                const zoom = parseFloat(document.getElementById('photoZoom').value || 1);
                const panX = parseFloat(document.getElementById('photoPanX').value || 0);
                const panY = parseFloat(document.getElementById('photoPanY').value || 0);

                // Compile and compress the image locally using the selected zoom & pan offsets
                const compressedBase64 = await this.compressImage(
                    this.selectedPhotoFile,
                    120,
                    120,
                    0.7,
                    zoom,
                    panX,
                    panY
                );

                playerData.photo_url = compressedBase64;
            } else {
                // Keep the old photo URL if we didn't perform any photo updates/removals
                if (currentPhotoUrl) {
                    playerData.photo_url = currentPhotoUrl;
                }
            }

            const success = await PlayerService.savePlayer(playerData);
            if (success) {
                UIService.showMessage(`✓ Player "${name}" saved!`, 'success');
                this.closeModal();
            } else {
                throw new Error('Firebase save operation returned false.');
            }
        } catch (error) {
            Logger.error('Error saving player:', error);
            UIService.showMessage(`✗ Failed to save player: ${error.message}`, 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalBtnText;
            }
        }
    },

    /**
     * Delete player from database
     */
    deletePlayer: async function(playerId, playerName) {
        if (!confirm(`Are you sure you want to remove "${playerName}" from the team roster?`)) {
            return;
        }

        try {
            const success = await PlayerService.deletePlayer(playerId);
            if (success) {
                UIService.showMessage(`✓ Player "${playerName}" removed`, 'success');
            } else {
                UIService.showMessage('✗ Failed to remove player', 'error');
            }
        } catch (error) {
            Logger.error('Error deleting player:', error);
            UIService.showMessage(`✗ Failed to delete player: ${error.message}`, 'error');
        }
    },

    /**
     * Escape single quotes for inline JS attributes
     */
    escapeQuote: function(str) {
        return str.replace(/'/g, "\\'");
    },

    /**
     * Escape HTML string
     */
    escapeHtml: function(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PlayersModule.init());
} else {
    PlayersModule.init();
}
