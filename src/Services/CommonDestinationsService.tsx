export class CommonDestinationsService {
    private static destinations = [

        { to: 'Kowhai River Car Park', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Papanui', distance: 78 }, 
        { to: 'Kowhai River Car Park', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Russley', distance: 69 }, 
        { to: 'Porter\'s Pass', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Papanui', distance: 82 }, 
        { to: 'Porter\'s Pass', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Russley', distance: 73 }, 
        { to: 'Castle Hill Village', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Papanui', distance: 96 }, 
        { to: 'Castle Hill Village', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Russley', distance: 87 }, 
        { to: 'Mistetoe Flat (Helicopter Hill)', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Papanui', distance: 106 }, 
        { to: 'Mistetoe Flat (Helicopter Hill)', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Russley', distance: 97 }, 
        { to: 'Cass River carpark', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Papanui', distance: 120 }, 
        { to: 'Cass River carpark', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Russley', distance: 111 }, 
        { to: 'Hawdon Shelter', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Papanui', distance: 125 }, 
        { to: 'Hawdon Shelter', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Russley', distance: 116 }, 
        { to: 'Bealey Spur carpark', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Papanui', distance: 133 }, 
        { to: 'Bealey Spur carpark', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Russley', distance: 124 }, 
        { to: 'Klondyke Corner', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Papanui', distance: 138 }, 
        { to: 'Klondyke Corner', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Russley', distance: 129 }, 
        { to: 'Arthur\'s Pass', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Papanui', distance: 146 }, 
        { to: 'Arthur\'s Pass', area: 'Arthur\'s Pass area (via West Coast Rd)', from: 'Z Russley', distance: 137 }, 

        { to: 'Windy Point', area: 'Lewis Pass area', from: 'Z Papanui', distance: 160 }, 
        { to: 'Windy Point', area: 'Lewis Pass area', from: 'Z Russley', distance: 162 }, 
        { to: 'Engineers Camp', area: 'Lewis Pass area', from: 'Z Papanui', distance: 162 }, 
        { to: 'Engineers Camp', area: 'Lewis Pass area', from: 'Z Russley', distance: 164 }, 
        { to: 'Boyle Village', area: 'Lewis Pass area', from: 'Z Papanui', distance: 169 }, 
        { to: 'Boyle Village', area: 'Lewis Pass area', from: 'Z Russley', distance: 171 }, 
        { to: 'Palmer Lodge', area: 'Lewis Pass area', from: 'Z Papanui', distance: 175 }, 
        { to: 'Palmer Lodge', area: 'Lewis Pass area', from: 'Z Russley', distance: 177 }, 
        { to: 'St James carpark', area: 'Lewis Pass area', from: 'Z Papanui', distance: 185 }, 
        { to: 'St James carpark', area: 'Lewis Pass area', from: 'Z Russley', distance: 187 }, 

        { to: 'Peak Hill carpark', area: 'Lake Coleridge', from: 'Z Papanui', distance: 108 }, 
        { to: 'Peak Hill carpark', area: 'Lake Coleridge', from: 'Z Russley', distance: 98 }, 
        { to: 'Glenrock carpark / Te Araroa Trail Head', area: 'Lake Coleridge', from: 'Z Papanui', distance: 126 }, 
        { to: 'Glenrock carpark / Te Araroa Trail Head', area: 'Lake Coleridge', from: 'Z Russley', distance: 116 }, 
        { to: 'Birdwood (The Spurs)', area: 'Lake Coleridge', from: 'Z Papanui', distance: 131 }, 
        { to: 'Birdwood (The Spurs)', area: 'Lake Coleridge', from: 'Z Russley', distance: 121 }, 

        { to: 'Sharpin Falls (Mt Sommers via Horotata)', area: 'Ashburton Lakes', from: 'Z Papanui', distance: 113 }, 
        { to: 'Sharpin Falls (Mt Sommers via Horotata)', area: 'Ashburton Lakes', from: 'Z Russley', distance: 104 }, 
        { to: 'Woolshed Creek carpark (via Rakaia)', area: 'Ashburton Lakes', from: 'Z Papanui', distance: 125 }, 
        { to: 'Woolshed Creek carpark (via Rakaia)', area: 'Ashburton Lakes', from: 'Z Russley', distance: 116 }, 
        { to: 'Lake Heron (Double Hut carpark)', area: 'Ashburton Lakes', from: 'Z Papanui', distance: 152 }, 
        { to: 'Lake Heron (Double Hut carpark)', area: 'Ashburton Lakes', from: 'Z Russley', distance: 143 }, 
        { to: 'Lake Clearwater carpark', area: 'Ashburton Lakes', from: 'Z Papanui', distance: 144 }, 
        { to: 'Lake Clearwater carpark', area: 'Ashburton Lakes', from: 'Z Russley', distance: 135 }, 
        { to: 'Lake Emma carpark', area: 'Ashburton Lakes', from: 'Z Papanui', distance: 140 }, 
        { to: 'Lake Emma carpark', area: 'Ashburton Lakes', from: 'Z Russley', distance: 131 }, 
        
        { to: 'Diamond Harbour', area: 'Banks Peninsula', from: 'Z Papanui', distance: 33 }, 
        { to: 'Gebbies Pass', area: 'Banks Peninsula', from: 'Z Papanui', distance: 25 }, 
        { to: 'Kaituna Valley', area: 'Banks Peninsula', from: 'Z Papanui', distance: 45 }, 
        { to: 'Kaituna Valley', area: 'Banks Peninsula', from: 'Z Russley', distance: 45 }, 
        { to: 'Akaroa Heritage Park', area: 'Banks Peninsula', from: 'Z Papanui', distance: 83 }, 
        { to: 'Akaroa Heritage Park', area: 'Banks Peninsula', from: 'Z Russley', distance: 83 }, 
        { to: 'Hinewai (upper carpark)', area: 'Banks Peninsula', from: 'Z Papanui', distance: 87 }, 
        { to: 'Hinewai (upper carpark)', area: 'Banks Peninsula', from: 'Z Russley', distance: 87 }, 
        { to: 'Hinewai (lower carpark)', area: 'Banks Peninsula', from: 'Z Papanui', distance: 93 },
        { to: 'Hinewai (lower carpark)', area: 'Banks Peninsula', from: 'Z Russley', distance: 93 } 
    ]

    public static getByGroups(): {[area: string]: {[to: string]: {[from: string]: number}}} {
        const grouped: {[area: string]: {[to: string]: {[from: string]: number}}} = {}
        this.destinations.forEach(destination => {
            if (!grouped[destination.area]) {
                grouped[destination.area] = {}
            }
            if (!grouped[destination.area][destination.to]) {
                grouped[destination.area][destination.to] = {}
            }
            grouped[destination.area][destination.to][destination.from] = destination.distance
        })
        return grouped
    }
}