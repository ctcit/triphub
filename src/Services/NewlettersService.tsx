import { BaseUrl } from '..';
import { INewsletter, INewsletterEvent, INewsletterTripReport } from '../Interfaces';
import { apiCall } from '../Utilities';

export class NewslettersService {
    public static getNewslettersCurrent(): Promise<INewsletter[]> {
        return apiCall('GET', BaseUrl + '/newsletters/current')
    }

    public static getNewslettersLatest(): Promise<INewsletter[]> {
        return apiCall('GET', BaseUrl + '/newsletters/latest')
    }

    public static async postNewsletterSetCurrent(id: number): Promise<INewsletter> {
        return apiCall('POST', BaseUrl + '/newsletters/' + id + '/current')
            .then((newsletters: INewsletter[]) => newsletters[0])
    }

    public static async postNewNewsletter(newsletter: INewsletter): Promise<INewsletter> {
        return apiCall('POST', BaseUrl + '/newsletters', newsletter)
            .then((newsletters: INewsletter[]) => newsletters[0])
    }

    public static async postNewsletter(id: number, data: any): Promise<INewsletter> {
        return apiCall('POST', BaseUrl + '/newsletters/' + id, data)
            .then((newsletters: INewsletter[]) => newsletters[0])
    }

    public static getNewslettersEvents(): Promise<INewsletterEvent[]> {
        return apiCall('GET', BaseUrl + '/newsletters/events')
    }

    public static getNewslettersUnpublishedEvents(): Promise<INewsletterEvent[]> {
        return apiCall('GET', BaseUrl + '/newsletters/unpublishedEvents')
    }


    public static getNewslettersTripReports(id: number): Promise<INewsletterTripReport[]> {
        return apiCall('GET', BaseUrl + '/newsletters/' + id + '/tripreports')
    }

    public static postNewslettersTripReports(id: number, tripReports: INewsletterTripReport[]): Promise<any> {
        return apiCall('POST', BaseUrl + '/newsletters/' + id + '/tripreports', tripReports)
    }

    public static patchNewslettersTripReports(id: number, tripReports: INewsletterTripReport[]): Promise<any> {
        return apiCall('PATCH', BaseUrl + '/newsletters/' + id + '/tripreports', tripReports)
    }


}
