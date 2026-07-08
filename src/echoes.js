/**
 * Oracle Collective Echoes
 * Simulated aggregate data representing the wisdom of parallel sessions.
 * These are weighted patterns for specific player archetypes.
 */
export const COLLECTIVE_ECHOES = {
    'The Speedrunner': {
        // Speedrunners prioritize movement to reach the observatory quickly
        'entrance': { 'move:north': { target: 'library', weight: 10 } },
        'library': { 'move:east': { target: 'observatory', weight: 15 } },
        'armory': { 'move:north': { target: 'observatory', weight: 15 } },
        'observatory': { 'move:west': { target: 'library', weight: 5 }, 'move:south': { target: 'armory', weight: 5 } }
    },
    'The Collector': {
        // Collectors prioritize taking items in every room
        'library': { 'take:scroll': { target: 'library', weight: 20 } },
        'armory': { 'take:shield': { target: 'armory', weight: 20 } },
        'observatory': { 'take:lens': { target: 'observatory', weight: 20 } }
    },
    'The Explorer': {
        // Explorers favor paths that lead to unvisited or diverse locations
        'entrance': {
            'move:east': { target: 'armory', weight: 8 },
            'move:north': { target: 'library', weight: 8 }
        },
        'library': { 'move:east': { target: 'observatory', weight: 12 } },
        'armory': { 'move:west': { target: 'entrance', weight: 12 } }
    }
};
