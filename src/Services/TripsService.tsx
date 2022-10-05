import { BaseUrl } from '..';
import { IEdit, IHistoryItem, IParticipant, ITrip, IValidation } from '../Interfaces';
import { apiCall, Mandatory } from '../Utilities';

export class TripsService {
    public static async getTrips(force: boolean = false): Promise<ITrip[]> {
        if (force || !this.getTripsPromise) {
            this.getTripsPromise = new Promise<ITrip[]>((resolve, reject) => {
                apiCall('GET', BaseUrl + '/trips')
                    .then((trips: ITrip[]) => {
                        this.trips = trips;
                        resolve(trips);
                    }, () => {
                        this.trips = [];
                        resolve([]);
                    }
                )
            });
        }
        return this.getTripsPromise;
    }

    public static get Trips(): ITrip[] {
        return this.trips
    }

    // supports offline usage
    public static async getTrip(id: number): Promise<ITrip> {
        return apiCall('GET', BaseUrl + '/trips/' + id)
            .then((trips: ITrip[]) => {
                // return this.applyPendingTripSyncChanges(trips[0])
                return trips[0]
            })
    }

    public static async postTripNew(data: ITrip): Promise<ITrip> {
        return apiCall('POST', BaseUrl + '/trips', data)
            .then((trips: ITrip[]) => trips[0])
    }

    // supports offline usage
    public static async postTripUpdate(id: number, data: any): Promise<ITrip> {
        return apiCall('POST', BaseUrl + '/trips/' + id, data)
            .then((trips: ITrip[]) => {
                // return this.applyPendingTripSyncChanges(trips[0])
                return trips[0]
            })
    }

    public static async getTripParticipants(id: number): Promise<IParticipant[]> {
        return apiCall('GET', BaseUrl + '/trips/' + id + '/participants')
    }

    public static async postTripParticipantNew(id: number, participant: IParticipant): Promise<IParticipant> {
        return apiCall('POST', BaseUrl + '/trips/' + id + '/participants', participant)
            .then((participants: IParticipant[]) => participants[0])
    }

    public static async postTripParticipant(id: number, participant: IParticipant): Promise<IParticipant> {
        return apiCall('POST', BaseUrl + '/trips/' + id + '/participants', participant)
            .then((participants: IParticipant[]) => participants[0])
    }

    public static async postTripParticipantUpdate(id: number, participantId: number, data: any): Promise<IParticipant> {
        return apiCall('POST', BaseUrl + '/trips/' + id + '/participants/' + participantId, data)
            .then((participants: IParticipant[]) => participants[0])
    }

    public static async postTripEmail(id: number, data: any): Promise<any> {
        return apiCall('POST', BaseUrl + '/trips/' + id + '/email', data);
    }

    public static async getTripHistory(id: number): Promise<IHistoryItem[]> {
        return apiCall('GET', BaseUrl + '/trips/' + id + '/history');
    }

    public static async postTripEditHeartbeatInit(id: number, data: any): Promise<IEdit[]> {
        return apiCall('POST', BaseUrl + '/trips/' + id + '/edit', data);
    }

    public static async postTripEditHeartbeat(id: number, editId: number, data: any): Promise<IEdit[]> {
        return apiCall('POST', BaseUrl + '/trips/' + id + '/edit/' + editId, data);
    }

    public static async deleteTripEditHeartbeat(id: number, editId: number): Promise<any> {
        return apiCall('DELETE', BaseUrl + '/trips/' + id + '/edit/' + editId, {});
    }

    public static validateTrip(trip: ITrip): IValidation[] {
        return [
            { field: 'title', ok: !trip.isDeleted, message: 'This trip has been deleted' },
            ...Mandatory(trip, ['title', 'description']),
            ...Mandatory(trip, trip.isSocial ? [] : ['cost', 'grade', 'departure_point']),
            { field: 'length', ok: (trip.length >= 1 && trip.length <= 14) || trip.isNoSignup, message: 'Length should be between 1 and 14 days' },
            { field: 'openDate', ok: (trip.openDate <= trip.closeDate), message: 'Open date must be on or before Close date' },
            { field: 'closeDate', ok: (trip.openDate <= trip.closeDate) || trip.isNoSignup, message: 'Open date must be on or before Close date' },
            { field: 'closeDate', ok: (trip.closeDate <= trip.tripDate) || trip.isNoSignup, message: 'Close date must be on or before Trip date' },
            { field: 'tripDate', ok: (trip.closeDate <= trip.tripDate) || trip.isNoSignup, message: 'Close date must be on or before Trip date' },
            { field: 'maxParticipants', ok: trip.maxParticipants >= 0, message: 'Max Participants must not be negative' },
        ]
    }

    public static validateParticipant(participant: IParticipant, participants: IParticipant[]): IValidation[] {
        const duplicate = participants.find(p => p.id !== participant.id && p.name === participant.name)
        return [
            ...Mandatory(participant, participant.isVehicleProvider ? ['name', 'vehicleRego'] : ['name']),
            { field: 'name', ok: !duplicate, message: `Duplicate name - ${participant.name}` }
        ]
    }

    // get the ids of trips that are in the trips cache (must have both details and participants)
    public static async getCachedTripIds(): Promise<number[]> {
        const tripRegex = /.*\/api\/api.php\/trips\/(\d*)/
        const participantsRegex = /.*\/api\/api.php\/trips\/(\d*)\/participants/
        return caches.open('trips').then((cache: Cache) => {
            return cache.keys().then((requests: readonly Request[]) => {
                const tripIds: number[] = []
                const participantsTripIds: number[] = []
                requests.map((request: Request) => {
                    const tripMatch = request.url.match(tripRegex)
                    const participantsMatch = request.url.match(participantsRegex)
                    if (tripMatch) {
                        tripIds.push(parseInt(tripMatch[1], 10))
                    }
                    if (participantsMatch) {
                        participantsTripIds.push(parseInt(participantsMatch[1], 10))
                    }
                })
                return tripIds.filter(id => participantsTripIds.includes(id))
            })
        })
    }

    public static async updateTripsCache(request: Request): Promise<void> {
        caches.open('trips');
    }

    // // apply any pending trip changes in the sync cache
    // public static applyPendingTripSyncChanges(trip: ITrip): Promise<ITrip> {
    //     const tripRegex = /.*\/api\/api.php\/trips\/(\d*)/
    //     return caches.open('syncs').then((cache: Cache) => {
    //         return cache.keys().then((requests: readonly Request[]) => {
    //             requests.map(async (request: Request) => {
    //                 const tripMatch = request.url.match(tripRegex)
    //                 if (tripMatch && parseInt(tripMatch[1]) === trip.id) {
    //                     const change = await request.json()
    //                     trip = {...trip, ...change}
    //                 }
    //             })
    //             return trip
    //         })
    //     })
    // }

    // // apply any pending participant changes in the sync cache
    // public static applyPendingParticipantSyncChanges(tripId: number, participants: IParticipant[]): Promise<IParticipant[]> {
    //     const participantsRegex = /.*\/api\/api.php\/trips\/(\d*)\/participants\/(\d*)/
    //     return caches.open('syncs').then((cache: Cache) => {
    //         return cache.keys().then((requests: readonly Request[]) => {
    //             requests.map((request: Request) => {
    //                 const participantsMatch = request.url.match(participantsRegex)
    //                 if (participantsMatch && parseInt(participantsMatch[1]) == tripId) {
    //                     const participantId = parseInt(participantsMatch[2])
    //                     participants.map(async (participant: IParticipant) => {
    //                         if (participantId == participant.id) {
    //                             const change = await request.json()
    //                             participant = {...participant, ...change}
    //                         }
    //                     })
    //                 }
    //             })
    //             return participants
    //         })
    //     })
    // }

    private static getTripsPromise: Promise<ITrip[]> | undefined = undefined

    private static trips: ITrip[] = []

    private static first<T>(responseArray: T[]): T {
        return responseArray[0]
    }

}
