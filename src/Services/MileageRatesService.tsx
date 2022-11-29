import { BaseUrl } from "src";
import { IMileageRate } from "src/Interfaces";
import { apiCallReturnAll, apiCallReturnFirst } from "src/Utilities";

export class MileageRatesService {

    // offline GET supported
    public static async getMileageRates(force: boolean = false): Promise<IMileageRate[]> {
        if (force || !this.getMileageRatesPromise) {
            this.getMileageRatesPromise = apiCallReturnAll<IMileageRate>('GET', BaseUrl + '/mileage_rates')
        }
        return this.getMileageRatesPromise;
    }

    public static async patchMileageRate(id: number, data: any): Promise<IMileageRate | null> {
        return apiCallReturnFirst<IMileageRate>('PATCH', BaseUrl + '/mileage_rates/' + id, data)
    }

    private static getMileageRatesPromise: Promise<IMileageRate[]> | undefined = undefined

}