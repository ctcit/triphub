import { BaseUrl } from '..';
import { IEdit, IHistoryItem, IParticipant, ITrip, IValidation } from '../Interfaces';
import { apiCall, Mandatory } from '../Utilities';

export class TripsService {

    // offline GET supported
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

    // offline GET supported
    public static async getTrip(id: number): Promise<ITrip> {
        return apiCall('GET', BaseUrl + '/trips/' + id)
            .then((trips: ITrip[]) => {
                return trips[0]
            })
    }

    public static async postTripNew(data: ITrip): Promise<ITrip> {
        return apiCall('POST', BaseUrl + '/trips', data)
            .then((trips: ITrip[]) => trips[0])
    }

    // offline background sync supported
    public static async postTripUpdate(id: number, data: any): Promise<ITrip> {
        return apiCall('POST', BaseUrl + '/trips/' + id, data)
            .then(async (trips: ITrip[]) => {
                return trips? trips[0] : await this.getTrip(id)
            })
    }

    // offline GET supported
    public static async getTripParticipants(id: number): Promise<IParticipant[]> {
        return apiCall('GET', BaseUrl + '/trips/' + id + '/participants')
    }

    public static async postTripParticipantNew(id: number, participant: IParticipant): Promise<IParticipant> {
        return apiCall('POST', BaseUrl + '/trips/' + id + '/participants', participant)
            .then((participants: IParticipant[]) => participants[0])
    }

    // offline background sync supported
    public static async postTripParticipantUpdate(id: number, participantId: number, data: any): Promise<IParticipant> {
        return apiCall('POST', BaseUrl + '/trips/' + id + '/participants/' + participantId, data)
            .then(async (participants: IParticipant[]) => {
                return participants ? 
                    participants[0] : 
                    (await this.getTripParticipants(id)).filter(p => p.id === participantId)[0]
            })
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

    // offline background sync supported
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
        const mandatoryFields = ['name']
        if (participant.isVehicleProvider) {
            mandatoryFields.push('vehicleRego')
        }
        return [
            ...Mandatory(participant, mandatoryFields),
            { field: 'name', ok: !duplicate, message: `Duplicate name - ${participant.name}` },
            { field: 'seats', ok: participant.seats > 0, message: `Seats must be greater than zero` }
        ]
    }

    private static getTripsPromise: Promise<ITrip[]> | undefined = undefined

    private static trips: ITrip[] = []

    private static first<T>(responseArray: T[]): T {
        return responseArray[0]
    }

}
