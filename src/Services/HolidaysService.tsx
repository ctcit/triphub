import { BaseUrl } from '..';
import { IHoliday } from '../Interfaces';
import { apiCall } from '../Utilities';

export class HolidaysService {

    // offline GET supported
    public static async getHolidays(force: boolean = false): Promise<IHoliday[]> {
        if (force || !this.getHolidaysPromise) {
            this.getHolidaysPromise = new Promise<IHoliday[]>((resolve, reject) => {
                apiCall('GET', BaseUrl + '/public_holidays')
                    .then((holidays: IHoliday[]) => {
                        this.holidays = holidays
                        resolve(holidays);
                    });
            });
        }
        return this.getHolidaysPromise;
    }

    public static get Holidays(): IHoliday[] {
        return this.holidays
    }

    public static get CanterburyHolidaysByDate(): Map<string, IHoliday> {
        return new Map<string, IHoliday>(
            this.holidays.filter(h => h.type === 'National holiday' || h.name === 'Canterbury Show Day')
                .map(h => [h.date, h] as [string, IHoliday])
        );
    }

    private static getHolidaysPromise: Promise<IHoliday[]> | undefined = undefined
    private static holidays: IHoliday[] = []

}
