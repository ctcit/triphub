import { BaseUrl } from '..';
import { IEdit, IHistoryItem, IParticipant, ITrip, IValidation } from '../Interfaces';
import { apiCall, apiCallReturnAll, apiCallReturnFirst, Mandatory } from '../Utilities';

export class TripsService {

    // offline GET supported
    public static async getTrips(force: boolean = false): Promise<ITrip[]> {
        if (force || !this.getTripsPromise) {
            this.getTripsPromise = apiCallReturnAll<ITrip>('GET', BaseUrl + '/trips')
        }
        return this.getTripsPromise;
    }

    // offline GET supported
    public static async getTrip(id: number): Promise<ITrip | null> {
        return apiCallReturnFirst<ITrip>('GET', BaseUrl + '/trips/' + id)
    }

    public static async postTripNew(data: ITrip): Promise<ITrip | null> {
        return apiCallReturnFirst<ITrip>('POST', BaseUrl + '/trips', data)
    }

    // offline background sync supported
    public static async postTripUpdate(id: number, data: any): Promise<ITrip | null> {
        return apiCallReturnFirst<ITrip>('POST', BaseUrl + '/trips/' + id, data)
    }

    // offline GET supported
    public static async getTripParticipants(id: number): Promise<IParticipant[]> {
        return apiCallReturnAll<IParticipant>('GET', BaseUrl + '/trips/' + id + '/participants')
    }

    public static async postTripParticipantNew(id: number, participant: IParticipant): Promise<IParticipant | null> {
        return apiCallReturnFirst<IParticipant>('POST', BaseUrl + '/trips/' + id + '/participants', participant)
    }

    // offline background sync supported
    public static async postTripParticipantUpdate(id: number, participantId: number, data: any): Promise<IParticipant | null> {
        return apiCallReturnFirst<IParticipant>('POST', BaseUrl + '/trips/' + id + '/participants/' + participantId, data)
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

    public static async getPastTrips(data: any): Promise<ITrip[]> {
        return apiCallReturnAll<ITrip>('POST', BaseUrl + '/trips/pasttrips', data)
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
            { field: 'seats', ok: !participant.isVehicleProvider || participant.seats > 0, message: `Seats must be greater than zero` },
            { field: 'engineSize', ok: !participant.isVehicleProvider || participant.isFixedCostVehicle || participant.engineSize !== null, message: `Engine size must be specified` },
            { field: 'vehicleCost', ok: !participant.isVehicleProvider || !participant.isFixedCostVehicle || participant.vehicleCost !== null, message: `Vehicle cost must be specified` },
        ]
    }

    public static validateCosts(trip: ITrip): IValidation[] {
        return [
            { field: 'payingParticipantsCount', ok: trip.payingParticipantsCount === null, message: 'Number to pay vehicle costs is overridden' },
            { field: 'totalVehicleCost', ok: trip.totalVehicleCost === null, message: 'Total vehicle costs is overridden' },
            { field: 'vehicleFee', ok: trip.vehicleFee === null, message: 'Vehicle fee is overridden' },
        ]
    }

    public static validateCostsParticipant(participant: IParticipant, participants: IParticipant[]): IValidation[] {
        return [
            { field: 'engineSize', ok: !participant.isVehicleProvider || participant.isFixedCostVehicle || participant.engineSize !== null, message: `Engine size must be specified` },
            { field: 'vehicleCost', ok: !participant.isVehicleProvider || !participant.isFixedCostVehicle || participant.vehicleCost !== null, message: `Vehicle cost must be specified` },
            { field: 'ratePerKm', ok: !participant.isVehicleProvider || participant.isFixedCostVehicle || participant.ratePerKm === null, message: `Rate is overridden` },
            { field: 'totalDistance', ok: !participant.isVehicleProvider || participant.isFixedCostVehicle || participant.totalDistance === null, message: `Total return distance is overridden` },
            { field: 'vehicleFee', ok: participant.vehicleFee === null, message: `Vehicle fee is overridden` },
            { field: 'nonMemberFee', ok: participant.nonMemberFee === null, message: `Non-member fee is overridden` },
            { field: 'otherFees', ok: participant.otherFees === null, message: `Other fees is overridden` },
        ]
    }


    private static getTripsPromise: Promise<ITrip[]> | undefined = undefined

}
