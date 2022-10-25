import { IParticipant, ITrip } from "src/Interfaces"

export class TripsCache {

    // cache to store:
    // GET members
    // GET config
    // GET maps
    // GET public_holidays
    public static getsCacheName = 'gets'

    // cache to store:
    // GET trips
    // GET trips/{id}
    // GET trips/{id}/participants
    public static tripsCacheName = 'trips'

    // get the ids of trips that are in the trips cache (must have both details and participants)
    public static async getCachedTripIds(): Promise<number[]> {
        const getTripRegex = /.*\/api\/api.php\/trips\/(\d*)/
        const getParticipantsRegex = /.*\/api\/api.php\/trips\/(\d*)\/participants/
        return caches.open(this.tripsCacheName).then((cache: Cache) => {
            return cache.keys().then((requests: readonly Request[]) => {
                const tripIds: number[] = []
                const participantsTripIds: number[] = []
                requests.map((request: Request) => {
                    const getTripMatch = request.url.match(getTripRegex)
                    const getParticipantsMatch = request.url.match(getParticipantsRegex)
                    if (getTripMatch) {
                        tripIds.push(parseInt(getTripMatch[1], 10))
                    }
                    if (getParticipantsMatch) {
                        participantsTripIds.push(parseInt(getParticipantsMatch[1], 10))
                    }
                })
                return tripIds.filter(id => participantsTripIds.includes(id))
            })
        })
    }

    // GET tiles*.data-cdn.linz.govt.nz
    public static tilesCacheName = 'tiles'

    // updateRequests:
    // - POST trips/{id}
    // - POST trips/{id}/participants/{pid}
    // require updating any of the following getRequests:
    // - GET trips
    // - GET trips/{id}
    // - GET trips/{id}/participants
    //
    // NB: Adding new trips or new participants NOT supported
    public static async updateTripsCache(updateRequest: Request): Promise<void> {
        const updateTripRegex = /.*\/api\/api.php\/trips\/(\d*)$/
        const updateParticipantRegex = /.*\/api\/api.php\/trips\/(\d*)\/participants\/(\d*)$/
        const updateTripMatch = updateRequest.url.match(updateTripRegex)
        const updateParticipantMatch = updateRequest.url.match(updateParticipantRegex)
        if (!updateTripMatch && !updateParticipantMatch) {
            return
        }

        const updateRequestJson = await updateRequest.json()

        const getTripsRegex = /.*\/api\/api.php\/trips$/
        const getTripRegex = /.*\/api\/api.php\/trips\/(\d*)$/
        const getParticipantsRegex = /.*\/api\/api.php\/trips\/(\d*)\/participants$/
        
        const cache = await caches.open(this.tripsCacheName)
        const getRequests = await cache.keys()
        getRequests.map(async (getRequest: Request) => {
            const getTripsMatch = getRequest.url.match(getTripsRegex)
            const getTripMatch = getRequest.url.match(getTripRegex)
            const getParticipantsMatch = getRequest.url.match(getParticipantsRegex)

            if (updateTripMatch && (getTripsMatch || getTripMatch)) {
                const updateTripId = parseInt(updateTripMatch[1], 10);
                const response = await cache.match(getRequest)
                if (response) {
                    let trips = (await response.json()) as unknown as ITrip[]
                    for(let tripIndex in trips) {
                        const trip = trips[tripIndex]
                        if (trip.id === updateTripId) {
                            trips[tripIndex] = {...trip, ...updateRequestJson}
                            const updatedResponse = new Response(JSON.stringify(trips))
                            cache.put(getRequest.url, updatedResponse)
                            break
                        }
                    }
                }

            } else if (updateParticipantMatch && getParticipantsMatch) {
                const getTripId = parseInt(getParticipantsMatch[1], 10);
                const updateTripId = parseInt(updateParticipantMatch[1], 10)
                if (getTripId === updateTripId) {
                    const updateParticipantsId = parseInt(updateParticipantMatch[2], 10);
                    const response = await cache.match(getRequest)
                    if (response) {
                        let participants = (await response.json()) as unknown as IParticipant[]
                        for(let participantIndex in participants) {
                            const participant = participants[participantIndex]
                            if (participant.id === updateParticipantsId) {
                                participants[participantIndex] = {...participant, ...updateRequestJson}
                                const updatedResponse = new Response(JSON.stringify(participants))
                                cache.put(getRequest.url, updatedResponse)
                                break
                            }
                        }
                    }

                }
            }
        })
    }

    public static clear() {
        caches.delete(this.tripsCacheName)
        caches.delete(this.getsCacheName)
        caches.delete(this.tilesCacheName)
    }

}
