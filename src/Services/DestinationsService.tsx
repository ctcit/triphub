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

    private static getDestinationsPromise: Promise<IDestination[]> | undefined = undefined
    private static destinations: IDestination[] = []


}