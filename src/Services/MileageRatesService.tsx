import { BaseUrl } from "src";
import { IMileageRate } from "src/Interfaces";
import { apiCall } from "src/Utilities";

export class MileageRatesService {

    // offline GET supported
    public static async getMileageRates(force: boolean = false): Promise<IMileageRate[]> {
        if (force || !this.getMileageRatesPromise) {
            this.getMileageRatesPromise = new Promise<IMileageRate[]>((resolve, reject) => {
                apiCall('GET', BaseUrl + '/mileage_rates')
                    .then((mileageRates: IMileageRate[]) => {
                        this.mileageRates = mileageRates
                        resolve(mileageRates);
                    });
            });
        }
        return this.getMileageRatesPromise;
    }

    private static getMileageRatesPromise: Promise<IMileageRate[]> | undefined = undefined
    private static mileageRates: IMileageRate[] = []


}