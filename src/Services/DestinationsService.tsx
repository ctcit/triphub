import { BaseUrl } from "src";
import { IDestination, IValidation } from "src/Interfaces";
import { apiCall, apiCallReturnFirst, apiCallReturnAll, Mandatory } from "src/Utilities";

export class DestinationsService {

    // offline GET supported
    public static async getDestinations(force: boolean = false): Promise<IDestination[]> {
        if (force || !this.getDestinationsPromise) {
            this.getDestinationsPromise = apiCallReturnAll<IDestination>('GET', BaseUrl + '/destinations')
        }
        return this.getDestinationsPromise;
    }

    public static async getByGroups(): Promise<{[area: string]: {[to: string]: {[from: string]: number}}}> {
        const grouped: {[area: string]: {[to: string]: {[from: string]: number}}} = {};
        (await this.getDestinations()).forEach((destination: IDestination) => {
            if (!grouped[destination.area]) {
                grouped[destination.area] = {}
            }
            if (!grouped[destination.area][destination.toLocation]) {
                grouped[destination.area][destination.toLocation] = {}
            }
            grouped[destination.area][destination.toLocation][destination.fromLocation] = destination.distance
        })
        return grouped
    }

    public static async postDestination(newDestination: IDestination): Promise<IDestination | null> {
        return apiCallReturnFirst<IDestination>('POST', BaseUrl + '/destinations', newDestination)
    }

    public static async patchDestination(id: number, data: any): Promise<IDestination | null> {
        return apiCallReturnFirst<IDestination>('PATCH', BaseUrl + '/destinations/' + id, data)
    }

    public static async deleteDestination(id: number): Promise<any> {
        return apiCall('DELETE', BaseUrl + '/destinations/' + id)
    }

    public static validateDestination(destination: IDestination): IValidation[] {
        return [
            ...Mandatory(destination, ['toLocation', 'fromLocation', 'area']),
            { field: 'distance', ok: destination.distance > 0, message: 'Distance should be greater than zero' }
        ]
    }

    private static getDestinationsPromise: Promise<IDestination[]> | undefined = undefined

}