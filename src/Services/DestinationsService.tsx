import { BaseUrl } from "src";
import { IDestination } from "src/Interfaces";
import { apiCall } from "src/Utilities";

export class DestinationsService {

    // offline GET supported
    public static async getDestinations(force: boolean = false): Promise<IDestination[]> {
        if (force || !this.getDestinationsPromise) {
            this.getDestinationsPromise = new Promise<IDestination[]>((resolve, reject) => {
                apiCall('GET', BaseUrl + '/destinations')
                    .then((destinations: IDestination[]) => {
                        this.destinations = destinations
                        resolve(destinations);
                    });
            });
        }
        return this.getDestinationsPromise;
    }

    public static async getByGroups(): Promise<{[area: string]: {[to: string]: {[from: string]: number}}}> {
        const grouped: {[area: string]: {[to: string]: {[from: string]: number}}} = {};
        (await this.getDestinations()).forEach((destination: IDestination) => {
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

    public static async postDestination(newDestination: IDestination): Promise<IDestination> {
        return apiCall('POST', BaseUrl + '/destinations', newDestination)
            .then((destinations: IDestination[]) => destinations[0])
    }

    public static async patchDestination(id: number, data: any): Promise<IDestination> {
        return apiCall('PATCH', BaseUrl + '/destinations/' + id, data)
            .then((destinations: IDestination[]) => destinations[0])
    }

    public static async deleteDestination(id: number): Promise<any> {
        return apiCall('DELETE', BaseUrl + '/destinations/' + id)
    }


    private static getDestinationsPromise: Promise<IDestination[]> | undefined = undefined
    private static destinations: IDestination[] = []


}