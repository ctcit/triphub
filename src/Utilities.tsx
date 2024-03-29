import { IParticipant, IValidation } from './Interfaces'
import { DateTime } from 'luxon'
import { BaseOpt } from 'src'
import { toast } from 'react-toastify';


export const DayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MonthOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function GetDateString(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toFixed(0).padStart(2, '0')}-${date.getDate().toFixed().padStart(2, '0')}`
}

export function AddDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

const dateFormats: { [key: string]: (d: Date) => string } = {
    YYYY: d => d.getFullYear().toFixed(),
    mmmm: d => d.toLocaleString('default', { month: 'long' }).toLowerCase(),
    Mmmm: d => d.toLocaleString('default', { month: 'long' }),
    MMMM: d => d.toLocaleString('default', { month: 'long' }).toUpperCase(),
    mmm: d => d.toLocaleString('default', { month: 'short' }).toLowerCase(),
    Mmm: d => d.toLocaleString('default', { month: 'short' }),
    MMM: d => d.toLocaleString('default', { month: 'short' }).toUpperCase(),
    MM: d => d.toLocaleString('default', { month: '2-digit' }),
    M: d => d.toLocaleString('default', { month: 'numeric' }),
    dddd: d => d.toLocaleString('default', { weekday: 'long' }).toLowerCase(),
    Dddd: d => d.toLocaleString('default', { weekday: 'long' }),
    DDDD: d => d.toLocaleString('default', { weekday: 'long' }).toUpperCase(),
    ddd: d => d.toLocaleString('default', { weekday: 'short' }).toLowerCase(),
    Ddd: d => d.toLocaleString('default', { weekday: 'short' }),
    DDD: d => d.toLocaleString('default', { weekday: 'short' }).toUpperCase(),
    DD: d => d.toLocaleString('default', { day: '2-digit' }),
    D: d => d.toLocaleString('default', { day: 'numeric' }),
    HH: d => d.getHours().toFixed().padStart(2, '0'),
    H: d => d.getHours().toFixed(),
    h: d => (((d.getHours() + 11) % 12) + 1).toFixed(),
    AMPM: d => d.getHours() < 12 ? 'AM' : 'PM',
    ampm: d => d.getHours() < 12 ? 'am' : 'pm',
    mm: d => d.getMinutes().toFixed().padStart(2, '0'),
    m: d => d.getMinutes().toFixed(),
    ss: d => d.getSeconds().toFixed().padStart(2, '0'),
    s: d => d.getSeconds().toFixed(),
    '.sss': d => (d.getMilliseconds() / 1000).toFixed(3).substring(1),
    '.ss': d => (d.getMilliseconds() / 1000).toFixed(2).substring(1),
    '.s': d => (d.getMilliseconds() / 1000).toFixed(1).substring(1),
}
const formatsRegex = new RegExp(["'(.*?)'", ...Object.keys(dateFormats).map(f => f.replace('.', '\\.'))].join('|'), 'g')

export function FormatDate(value: Date | string | number, format: string) {
    return format.replace(formatsRegex, (part, quoted) => dateFormats[part]?.(new Date(value)) ?? quoted)
}

export function GetDate(value: Date | string | number): string {
    return FormatDate(value, 'Ddd D Mmm')
}

export function GetDateFullMonth(value: Date | string | number): string {
    return FormatDate(value, 'Ddd D Mmmm')
}

export function GetFullDate(value: Date | string | number): string {
    return FormatDate(value, 'Ddd D Mmm YYYY')
}

export function GetLength(length: number, startDate: Date): string {
    const startsOnSat = startDate.getDay() === 6
    return (length === 1) ? 'Day' : (length === 2 && startsOnSat) ? 'Weekend' : length + ' days'
}

export function IsValidDateString(dateString: string): boolean {
    return DateTime.fromISO(dateString).isValid
}

export function GetDisplayPriority(participant: IParticipant): number {
    return participant.id === -1 ? 100000000000 : (participant.displayPriority || participant.id)
}

export function CountWhile(func: (x: number) => boolean): number {
    let i = 0
    while (func(i)) {
        i++
    }
    return i
}

export function SafeJsonParse(json: string, defaultValue: any): any {
    try {
        return JSON.parse(json)
    } catch (err) {
        return defaultValue
    }
}

export function Mandatory(obj: any, fields: string[]): IValidation[] {
    return fields.map(field => ({
        field, ok: obj[field] !== '', message: TitleFromId(field) + ' must be entered'
    }))
}

export function TitleFromId(id: string | null): string {
    return (id || '').replace('_', ' ').replace(/\b\w/g, x => x.toUpperCase()).replace(/([a-z])([A-Z])/g, "$1 $2")
}

export function GetClosestWednesday(to: Date): Date {
    // Date counts days of week from Sunday, zero indexed
    const wednesday: number = 3
    const closestWednesday: Date = new Date(to)
    closestWednesday.setDate(to.getDate() + (wednesday - to.getDay()))
    return closestWednesday
}

export function GetStartOfNextMonth(): Date {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

export function CapitaliseFirstLetter(input: string): string {
    return input.charAt(0).toUpperCase() + input.slice(1)
}

const Grades = [
    { pattern: /Bike/, value: null, icon: 'bicycle' },
    { pattern: /Water|Wet/, value: null, icon: 'water' },
    { pattern: /Training/i, value: null, icon: 'graduation-cap' },
    { pattern: /Easy.*Mod/i, value: 3, icon: 'hiking' },
    { pattern: /Mod.*Easy/i, value: 3, icon: 'hiking' },
    { pattern: /Mod.*Hard/i, value: 5, icon: 'hiking' },
    { pattern: /Hard.*Mod/i, value: 5, icon: 'hiking' },
    { pattern: /Social/i, value: 1, icon: 'users' },
    { pattern: /Easy/i, value: 2, icon: 'hiking' },
    { pattern: /Mod/i, value: 4, icon: 'hiking' },
    { pattern: /Hard/i, value: 6, icon: 'hiking' }] as const

export function GradeValue({ grade }: { grade: string }) {
    return Grades.find(({ pattern, value }) => value && grade.match(pattern))?.value ?? 7
}

export function GradeIcon({ grade }: { grade: string }) {
    return Grades.find(({ pattern }) => grade.match(pattern))?.icon ?? 'hiking'
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
    try {
        const result = await fetch(url, request)
        const text = await result.text()
    
        try {
            return JSON.parse(text)
        } catch (ex) {
            console.log(`Failed to parse response: error=${ex} url=${url} response=${text}`)
            toast.error(`An unexpected response was returned from the server (failed to parse)`)
            return null
        }
    } catch(ex) {
        console.log(`Failed to fetch: ${ex} url=${url}`)
        toast.error(`An error occurred sending or getting data to/from the server`)
        checkIfDefinitelyOnline()
        return null
    }
}

export async function apiCallReturnAll<T>(method: string, url: string, data?: any): Promise<T[]> {
    return apiCall(method, url, data).then((response: any) => {
        if (response === null) {
            return [] // already toasted
        } else if (response.length === undefined) {
            console.log(`An array was expected: url=${url}`)
            toast.error(`An unexpected response was returned from the server (no array)`)
            return []

        } else {
            return response as T[]
        }
    })
}

export async function apiCallReturnFirst<T>(method: string, url: string, data?: any): Promise<T | null> {
    return apiCall(method, url, data).then((response: any) => {
        if (response === null) {
            return null // already toasted
        } else if (!response.length) {
            console.log(`At least one item in the array was expected: url=${url}`)
            toast.error(`An unexpected response was returned from the server (no first item)`)
            return null

        } else {
            return response[0]
        }
    })
}

export function checkIfDefinitelyOnline(): void {
    if (navigator.serviceWorker?.controller) {
        // get service worker to do test (bypasses caching, etc?)
        navigator.serviceWorker.controller.postMessage({type: 'CHECK_IF_ONLINE'})
    } else {
        // no service worker so get app to do test
        let url = `${process.env.PUBLIC_URL}/CTCLogo.png`;
        let request = new Request(url, {
          method: 'HEAD', // skip the actual content download
        });
        fetch(request, {cache: 'no-store'})
          .then(response => {
            console.log('Definitely online (app determined)')
            return window.postMessage({ type: 'IS_ONLINE', isDefinitelyOnline: true })
          },
          (error) => {
            console.log('Definitely offline (app determined)')
            return window.postMessage({ type: 'IS_ONLINE', isDefinitelyOnline: false })
          })
    }
}

export function BindMethods(obj: any) {
    for (const method of Object.getOwnPropertyNames(Object.getPrototypeOf(obj)).filter(m => /^on[A-Z]/.test(m))) {
        obj[method] = obj[method].bind(obj)
    }
}

export function escapeRegex(string: string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}