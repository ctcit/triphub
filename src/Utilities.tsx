import { IParticipant } from './Interfaces';
import { DateTime } from 'luxon';
import { BaseOpt } from 'src';

export const DayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MonthOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function GetDateString(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 101).toString().substr(1, 2)}-${(date.getDate() + 100).toString().substr(1, 2)}`
}

export function AddDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function GetDate(dateString: string): string {
    const date = new Date(dateString)
    return DayOfWeek[date.getDay()] + ' ' + date.getDate() + ' ' + MonthOfYear[date.getMonth()]
}

export function GetFullDate(dateString: string): string {
    const date = new Date(dateString)
    return DayOfWeek[date.getDay()] + ' ' + date.getDate() + ' ' + MonthOfYear[date.getMonth()] + ' ' + date.getFullYear()
}

export function GetLength(length: number, startDate: Date): string {
    const startsOnSat = startDate.getDay() === 6
    return (length === 1) ? 'Day' : (length === 2 && startsOnSat) ? 'Weekend' : length + ' days'
}

export function IsValidDateString(dateString: string): boolean {
    return DateTime.fromISO(dateString).isValid
}

export function GetDisplayPriority(participant: IParticipant): number {
    return participant.displayPriority || participant.id
}

export function CountWhile(func: (x: number) => boolean): number {
    let i = 0;
    while (func(i)) {
        i++
    }
    return i
}

export function SafeJsonParse(json: string, defaultValue: any): any {
    try {
        return JSON.parse(json);
    } catch (err) {
        return defaultValue
    }
}

export function TitleFromId(id: string): string {
    return id.replace('_', ' ').replace(/\b\w/g, x => x.toUpperCase()).replace(/([a-z])([A-Z])/g, "$1 $2")
}

export function GetClosestWednesday(to: Date): Date {
    // Date counts days of week from Sunday, zero indexed
    const wednesday: number = 3;
    const closestWednesday: Date = new Date(to)
    closestWednesday.setDate(to.getDate() + (wednesday - to.getDay()))
    return closestWednesday
}

export function GetStartOfNextMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

export function CapitaliseFirstLetter(input: string): string {
    return input.charAt(0).toUpperCase() + input.slice(1);
}

export async function apiCall(method: string, url: string, data?: any): Promise<any> {
    const request: RequestInit = /localhost/.test(`${window.location}`) ? { headers: BaseOpt } : {}
    // Accept header is required when querying the db api, and doesn't hurt when querying the triphub api
    request.headers = { ...request.headers, 'Accept': 'application/json' }

    request.method = method

    if (data) {
        request.headers = { ...request.headers, 'Content-Type': 'application/json' }
        request.body = JSON.stringify(data)
    }

    console.log(`${method} ${url}`)
    const result = await fetch(url, request);
    const text = await result.text()

    try {
        return JSON.parse(text);
    }
    catch (ex) {
        console.log(text)
        return null
    }
}

