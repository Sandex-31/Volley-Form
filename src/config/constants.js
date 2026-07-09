/**
 * Application Constants
 * Centralized configuration for the entire application
 */

const APP_CONSTANTS = {
    // Authentication
    ADMIN_PASSWORD: 'admin123',

    // File Upload
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB

    // Form Configuration
    FORM_STEPS: 3,
    FORM_STEP_NAMES: ['Personal', 'Exercises', 'Notes'],

    // Exercise Limits
    MAX_EXERCISES_PER_FORM: 10,

    // Storage Keys
    STORAGE_KEYS: {
        ADMIN_LOGGED_IN: 'adminLoggedIn',
        EXERCISES_LIST: 'exercisesList',
        SELECTED_EXERCISES: 'selectedExercises'
    },

    // Firebase References
    FIREBASE_REFS: {
        FORM_SUBMISSIONS: 'formSubmissions',
        SELECTED_EXERCISES: 'selectedExercises',
        MATCH_STATS: 'matchStats',
        MATCH_LINEUPS: 'matchLineups',
        PLAYERS: 'players',
        MATCHES: 'matches'
    },

    // Rating Labels
    RATING_LABELS: ['😞', '😐', '😊', '😄', '🤩'],

    // Scheduled Deletions
    SCHEDULED_DELETIONS: {
        ENABLED: true,
        DAYS: [2, 5], // Tuesday (2) and Friday (5)
        TIME: '00:00 UTC'
    }
};

// Default exercises list
const DEFAULT_EXERCISES = [
    'TEST NUOVO ESERCIZIO GENERALE',
    'Liberi - TEST NUOVO ESERCIZIO',
    'Bande - TEST NUOVO ESERCIZIO',
    'Opposti - TEST NUOVO ESERCIZIO',
    'Centrali - TEST NUOVO ESERCIZIO',
    'Palleggi - TEST NUOVO ESERCIZIO',
    'Warm-up (giri di campo)',
    'Preparazione atletica (addome/dorso/gambe)',
    'Esplosività (salti, sprint, balzi)',
    'Suicidi e scatti',
    'Bagherone (1v1 bagher)',
    'Inferno & Paradiso',
    'Partitella',
    'Servizio (mirato per ruoli)',
    'Difesa (1, 6, 5 con 2 schiacciatori)',
    'Difesa (4 ruoli autogestita, 1 schiacciatore a giro)',
    'Ricezione (4 in rice, opposti/centrali servizio)',
    'Ricezione (liberi in rice, il resto in servizio)',
    'Ricezione (doppia ricezione a 2 campi)',
    'Situazione di gioco (6 vs 6, con muro a 2 o 3)',
    'Attacchi (uno o entrambi i campi, bande/opposti/centrali)',
    'Attacchi (un campo, bande/opposti, centrali a muro)',
    'Attacchi (bande/opposti, approccio e salto con blocco della palla)',
    'Attacchi (approccio, con il minimo di passi, senza toccare la rete con la mano)',
    'Attacchi (tecnica diagonali/parallele/pallonetti con pallina da tennis)',
    'Attacchi (approccio con tappetino per staccare il primo passo)',
    'Bande (approccio a muro e rotazione in posizione di attacco)',
    'Bande (movimento delle braccia con palla da tennis)',
    'Liberi (rinforzo gambe e posizione squat con spostamento/affondi/hip trust/ single leg reach)',
    'Liberi (scatti con cinesini)',
    'Liberi (bagher a chiamata partento di spalle)',
    'Liberi (bagher con elastico alle spalliere)',
    'Liberi (difesa palla corta/palla lunga)',
    'Opposti (attacco con muro)',
    'Opposti (approccio per attacco da prima)',
    'Opposti (approccio per attacco da seconda)',
    'Centrali (approccio ad attacco in prima)',
    'Centrali (muro a 2 entrambi i lati)',
    'Centrali (muro singolo con spostamento laterale doppio tramite cinesini)',
    'Centrali (situazione di gioco con muro e approccio)',
    'Centrali (muro con lettura del palleggio)'
];
