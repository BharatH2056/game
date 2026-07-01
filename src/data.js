export const rooms = {
    'entrance': {
        name: 'The Entrance',
        description: 'A cold, dimly lit stone hallway. Heavy iron doors stand to the North and East.',
        mood: '#1a1a2e',
        exits: {
            'north': 'library',
            'east': 'armory'
        },
        items: []
    },
    'library': {
        name: 'The Library',
        description: 'Walls lined with ancient, dusty scrolls. A large oak desk sits in the center. There are exits to the South and East.',
        mood: '#2e1a1a',
        exits: {
            'south': 'entrance',
            'east': 'observatory'
        },
        items: ['scroll']
    },
    'armory': {
        name: 'The Armory',
        description: 'Racks of rusted swords and shields. The air smells of metal and age. Exits lead West and North.',
        mood: '#1a2e1a',
        exits: {
            'west': 'entrance',
            'north': 'observatory'
        },
        items: ['shield']
    },
    'observatory': {
        name: 'The Observatory',
        description: 'A giant telescope points towards a ceiling that shows the night sky, even in daylight. Exits lead South and West.',
        mood: '#1a2e2e',
        exits: {
            'south': 'armory',
            'west': 'library'
        },
        items: ['lens']
    }
};
