import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import * as React from 'react';
import { BaseUrl } from '.';
import { IMember, IConfig, IMap, ITrip, IValidation, IParticipant, IHoliday, IArchivedRoute, Role } from './Interfaces';
import { Trip } from './Trip';
import { TripsList } from './TripsList';
import { Calendar } from './Calendar';
import { apiCall, TitleFromId } from './Utilities';
import { TriphubNavbar } from './TriphubNavBar';
import { Newsletter } from './Newsletter/Newsletter';
import { Spinner, Done } from './Widgets';
import Container from 'reactstrap/lib/Container';
import Jumbotron from 'reactstrap/lib/Jumbotron';
import { INotification, NotificationArea } from './NotificationArea';

export class App extends Component<{
}, {
    status?: any
    statusShow?: boolean
    path: string
    isLoading: boolean
    isLoadingConfig: boolean
    isLoadingMaps: boolean
    isLoadingArchivedRoutes: boolean
    isLoadingMembers: boolean
    isLoadingHolidays: boolean
    role: Role
    me: IMember
    members: IMember[]
    membersById: { [id: number]: IMember }
    membersByName: { [name: string]: IMember }
    maps: IMap[],
    archivedRoutes: IArchivedRoute[],
    holidayMap: { [id: string]: IHoliday }
    config: IConfig
    statusId?: any
    inIFrame: boolean,
    notifications: INotification[]
}> {
    public trip: React.RefObject<Trip>
    public triplist: React.RefObject<TripsList>
    public calendar: React.RefObject<Calendar>

    constructor(props: any) {
        super(props)
        this.state = {
            config: {
                editRefreshInSec: 10,
                printLines: 25,
                calendarStartOfWeek: 1,
                prerequisiteEquipment: 'Ice Axe,Crampons,Helmet,Rope',
                prerequisiteSkills: 'Snow Skills,River Crossing',
            },
            path: window.top.location.hash.replace('#', ''),
            isLoading: false,
            isLoadingConfig: true,
            isLoadingMaps: true,
            isLoadingArchivedRoutes: true,
            isLoadingMembers: true,
            isLoadingHolidays: true,
            role: Role.NonMember,
            members: [],
            me: {} as IMember,
            membersById: {},
            membersByName: {},
            maps: [],
            archivedRoutes: [],
            holidayMap: {},
            status: ['Loading ', Spinner],
            statusShow: true,
            inIFrame: true, // true if to style/behave for use in iFrame; false to style/behave as standalone app
            notifications: []
        }
        this.trip = React.createRef()
        this.triplist = React.createRef()
        this.calendar = React.createRef()
        window.top.onpopstate = this.handlePopState.bind(this)
    }

    public handlePopState(event: PopStateEvent) {
        if (event.state !== null) {
            this.changePath(event.state.path)
        }
        else {
            this.changePath("/")
        }
    }

    public setStatus(status: any, keepFor?: number): void {
        if (this.state.statusId !== undefined) {
            clearTimeout(this.state.statusId)
        }
        this.setState({
            status, statusShow: true,
            statusId: keepFor && setTimeout(() => this.setState({ statusShow: false }), keepFor)
        })
    }

    public setPath(path: string): void {
        window.top.history.pushState({ path }, path, "#" + path);
        this.changePath(path)
    }


    public get amAdmin(): boolean { return this.state.role >= Role.Admin }

    public get amTripLeader(): boolean { return this.state.role >= Role.TripLeader }

    public async triphubApiCall(method: string, url: string, data?: any, isTripEdit?: boolean): Promise<any> {
        if (isTripEdit && this.trip.current && this.trip.current.state.editHref && !this.trip.current.state.editIsEdited) {
            this.trip.current.setState({ editIsEdited: true })
        }
        return apiCall(method, url, data)
    }

    public get members(): IMember[] {
        return this.state.members
    }

    public get me(): IMember {
        return this.state.me
    }

    public getMemberById(id: number): IMember {
        return this.state.membersById[id] || { id, name: 'Anonymous' } as IMember
    }

    public getMemberByName(name: string): IMember | null {
        return this.state.membersByName[name]
    }

    public get maps(): IMap[] {
        return this.state.maps
    }

    public get archivedRoutes(): IArchivedRoute[] {
        return this.state.archivedRoutes;
    }

    public validateTrip(trip: ITrip): IValidation[] {
        return !this.state.isLoading ? [
            { field: 'title', ok: !trip.isDeleted, message: 'This trip has been deleted' },
            ...this.mandatory(trip, ['title', 'description']),
            ...this.mandatory(trip, trip.isSocial ? [] : ['cost', 'grade', 'departure_point']),
            { field: 'length', ok: (trip.length >= 1 && trip.length <= 14) || trip.isNoSignup, message: 'Length should be between 1 and 14 days' },
            { field: 'openDate', ok: (trip.openDate <= trip.closeDate), message: 'Open date must be on or before Close date' },
            { field: 'closeDate', ok: (trip.openDate <= trip.closeDate) || trip.isNoSignup, message: 'Open date must be on or before Close date' },
            { field: 'closeDate', ok: (trip.closeDate <= trip.tripDate) || trip.isNoSignup, message: 'Close date must be on or before Trip date' },
            { field: 'tripDate', ok: (trip.closeDate <= trip.tripDate) || trip.isNoSignup, message: 'Close date must be on or before Trip date' },
            { field: 'maxParticipants', ok: trip.maxParticipants >= 0, message: 'Max Participants must not be negative' },
        ] : []
    }

    public validateParticipant(participant: IParticipant): IValidation[] {
        return [
            {
                field: 'vehicleRego', ok: !participant.isVehicleProvider || participant.vehicleRego !== '',
                message: 'Rego must be specified'
            }
        ]
    }

    public mandatory(obj: any, fields: string[]): IValidation[] {
        return fields.map(field => ({
            field, ok: obj[field] !== '', message: TitleFromId(field) + ' must be entered'
        }))
    }

    public requeryMembers(): void {
        this.triphubApiCall('GET', BaseUrl + '/members')
            .then((members: IMember[]) => {

                const membersById: { [id: number]: IMember } = {}
                const membersByName: { [name: string]: IMember } = {}
                const me = members.find((m: IMember) => m.isMe) || {} as unknown as IMember

                members = members.filter(m => m.name !== '')
                members.forEach(m => m.role = Role[m.role as unknown as string])
                members.filter(m => m.isMember).forEach(m => membersById[m.id] = m)
                members.filter(m => m.isMember).forEach(m => membersByName[m.name] = m)
                members = members.filter(m => m.isMember || !membersByName[m.name])
                members.filter(m => !m.isMember).forEach(m => membersByName[m.name] = m)

                this.setState({ role: me.role, me, members, membersById, membersByName, isLoadingMembers: false })
            })
    }

    public componentDidMount(): void {
        this.requeryMembers()

        this.triphubApiCall('GET', BaseUrl + '/config')
            .then(config => this.setState({ config: config[0], isLoadingConfig: false }));
        this.triphubApiCall('GET', BaseUrl + '/maps')
            .then(maps => this.setState({ maps, isLoadingMaps: false }));
        this.triphubApiCall('GET', BaseUrl + '/routes')
            .then(archivedRoutes => this.setState({ archivedRoutes, isLoadingArchivedRoutes: false }));
        this.triphubApiCall('GET', BaseUrl + '/public_holidays')
            .then((holidays: IHoliday[]) => {
                const holidayMap = {}

                for (const holiday of holidays) {
                    if (holiday.type === 'National holiday' || holiday.name === 'Canterbury Show Day') {
                        holidayMap[holiday.date] = holiday
                    }
                }

                this.setState({ holidayMap, isLoadingHolidays: false })
            });
    }

    public containerClassName() {
        return this.state.inIFrame ? "outer-container " : ""
    }

    public addNotification(text: string, colour: string) {
        const notifications: INotification[] = [...this.state.notifications, { text, colour }]
        this.setState({ notifications })
    }

    public render() {
        const state = this.state
        const loading = Object.keys(state).filter(k => /isLoading./.test(k))
        const rendering = loading.some(name => state[name]) ? 'loading' : `${state.path}/`.split('/')[1]
        const renderings = {
            loading: () =>
                <Container className={this.containerClassName() + "triphub-loading-container"}>
                    <Jumbotron key='loadingAlert' variant='primary'>
                        {loading.map(name =>
                            <div key={name}>{state[name] ? Spinner : Done} {TitleFromId(name.substr(2))}</div>)}
                    </Jumbotron>
                </Container>,
            calendar: () => <Calendar app={this} />,
            newtrip: () => <Trip app={this} isNew={true} isNewSocial={false} />,
            newsocial: () => <Trip app={this} isNew={true} isNewSocial={true} />,
            newsletter: () => <Newsletter app={this} />,
            trips: () => <Trip app={this} isNew={false} isNewSocial={true} href={BaseUrl + state.path} />,
            default: () => <TripsList app={this} />,
        }

        return [
            <TriphubNavbar key='triphubNavbar' app={this} />,
            <NotificationArea notifications={state.notifications} key='notificationArea'
                containerClassName={this.containerClassName()} />,
            (renderings[rendering] || renderings.default)()
        ]
    }

    private changePath(path: string): void {
        window.scrollTo(0, 0)
        this.setState({ path, notifications: [] })
    }

}
