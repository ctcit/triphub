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
import { ManageRoutes } from './ManageRoutes/ManageRoutes';

export class App extends Component<{
}, {
    path: string
    isLoadingConfig: boolean
    isLoadingMaps: boolean
    isLoadingMembers: boolean
    isLoadingHolidays: boolean
    role: Role
    me: IMember
    members: IMember[]
    membersById: Map<number, IMember>
    membersByName: Map<string, IMember>
    maps: IMap[],
    holidayMap: Map<string, IHoliday>
    config: IConfig
    statusId?: any
    inIFrame: boolean,
    notifications: INotification[]
}> {
    public trip: React.RefObject<Trip>
    public triplist: React.RefObject<TripsList>
    public calendar: React.RefObject<Calendar>
    private archivedRoutes: IArchivedRoute[] | undefined = undefined

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
            isLoadingConfig: true,
            isLoadingMaps: true,
            isLoadingMembers: true,
            isLoadingHolidays: true,
            role: Role.NonMember,
            members: [],
            me: {} as IMember,
            membersById: new Map(),
            membersByName: new Map(),
            maps: [],
            holidayMap: new Map(),
            inIFrame: true, // true if to style/behave for use in iFrame; false to style/behave as standalone app
            notifications: []
        }
        this.trip = React.createRef()
        this.triplist = React.createRef()
        this.calendar = React.createRef()

        window.top.onpopstate = this.onPopState.bind(this)
    }

    public onPopState(event: PopStateEvent) {
        this.changePath(event.state === null ? '/' : event.state.path)
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
        return this.state.membersById.get(id) || { id, name: 'Anonymous' } as IMember
    }

    public getMemberByName(name: string): IMember | undefined {
        return this.state.membersByName.get(name)
    }

    public get maps(): IMap[] {
        return this.state.maps
    }

    public async getArchivedRoutes(includeHidden: boolean = false, force: boolean = false): Promise<IArchivedRoute[]> {
        if (force || !this.archivedRoutes) {
            this.archivedRoutes = await this.triphubApiCall('GET', BaseUrl + '/routes?includeHidden=' + includeHidden );
        }
        return this.archivedRoutes as IArchivedRoute[];
    }

    public validateTrip(trip: ITrip): IValidation[] {
        return [
            { field: 'title', ok: !trip.isDeleted, message: 'This trip has been deleted' },
            ...this.mandatory(trip, ['title', 'description']),
            ...this.mandatory(trip, trip.isSocial ? [] : ['cost', 'grade', 'departure_point']),
            { field: 'length', ok: (trip.length >= 1 && trip.length <= 14) || trip.isNoSignup, message: 'Length should be between 1 and 14 days' },
            { field: 'openDate', ok: (trip.openDate <= trip.closeDate), message: 'Open date must be on or before Close date' },
            { field: 'closeDate', ok: (trip.openDate <= trip.closeDate) || trip.isNoSignup, message: 'Open date must be on or before Close date' },
            { field: 'closeDate', ok: (trip.closeDate <= trip.tripDate) || trip.isNoSignup, message: 'Close date must be on or before Trip date' },
            { field: 'tripDate', ok: (trip.closeDate <= trip.tripDate) || trip.isNoSignup, message: 'Close date must be on or before Trip date' },
            { field: 'maxParticipants', ok: trip.maxParticipants >= 0, message: 'Max Participants must not be negative' },
        ]
    }

    public validateParticipant(participant: IParticipant, participants: IParticipant[]): IValidation[] {
        const duplicate = participants.find(p => p.id !== participant.id && p.name === participant.name)
        return [
            ...this.mandatory(participant, participant.isVehicleProvider ? ['name', 'rego'] : ['name']),
            { field: 'name', ok: !duplicate, message: `Duplicate name - ${participant.name}` }
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

                const membersById = new Map<number, IMember>()
                const membersByName = new Map<string, IMember>()
                const me = members.find((m: IMember) => m.isMe) || {} as unknown as IMember

                members = members.filter(m => m.name !== '')
                members.filter(m => m.isMember).forEach(m => membersById.set(m.id, m))
                members.filter(m => m.isMember).forEach(m => membersByName.set(m.name, m))
                members = members.filter(m => m.isMember || !membersByName[m.name])
                members.filter(m => !m.isMember).forEach(m => membersByName.set(m.name, m))
                members.forEach(m => m.role = Role[m.role as unknown as string])

                this.setState({ role: me.role, me, members, membersById, membersByName, isLoadingMembers: false })
            })
    }

    public componentDidMount(): void {
        this.requeryMembers()

        this.triphubApiCall('GET', BaseUrl + '/config')
            .then(config => this.setState({ config: config[0], isLoadingConfig: false }));
        this.triphubApiCall('GET', BaseUrl + '/maps')
            .then(maps => this.setState({ maps, isLoadingMaps: false }));
        this.triphubApiCall('GET', BaseUrl + '/public_holidays')
            .then((holidays: IHoliday[]) => {
                const holidayMap = new Map<string, IHoliday>(
                    holidays.filter(h => h.type === 'National holiday' || h.name === 'Canterbury Show Day')
                        .map(h => [h.date, h] as [string, IHoliday])
                )

                this.setState({ holidayMap, isLoadingHolidays: false })
            });
    }

    public get containerClassName() {
        return this.state.inIFrame ? "outer-container " : ""
    }

    public addNotification(text: string, colour: string) {
        const notifications: INotification[] = [...this.state.notifications, { text, colour }]
        this.setState({ notifications })
    }

    public get isLoading(): boolean {
        return this.loadingFields(this.state).some(f => this.state[f])
    }
    public loadingFields(state: any): string[] {
        return Object.keys(state).filter(f => /^isLoading[A-Z]/.test(f))
    }
    public loadingStatus(state: any): JSX.Element {
        return <Container className={this.containerClassName + "triphub-loading-container"}>
            <Jumbotron key='loadingAlert' variant='primary'>
                {this.loadingFields(state).map(f =>
                    <div key={f}>{state[f] ? Spinner : Done} {TitleFromId(f.substr(2))}</div>)}
            </Jumbotron>
        </Container>
    }

    public render() {
        const path = this.state.path
        const rendering = this.isLoading ? 'loading' : `${path}/`.split('/')[1]
        const renderings = {
            loading: () => this.loadingStatus(this.state),
            calendar: () => <Calendar app={this} />,
            newtrip: () => <Trip app={this} isNew={true} isNewSocial={false} />,
            newsocial: () => <Trip app={this} isNew={true} isNewSocial={true} />,
            routes: () => <ManageRoutes app={this}/>,
            newsletter: () => <Newsletter app={this} />,
            trips: () => <Trip app={this} isNew={false} isNewSocial={true} href={BaseUrl + path} />,
            default: () => <TripsList app={this} />,
        }

        return [
            <TriphubNavbar key='triphubNavbar' app={this} />,
            <NotificationArea notifications={this.state.notifications} key='notificationArea'
                containerClassName={this.containerClassName} />,
            (renderings[rendering] || renderings.default)()
        ]
    }

    private changePath(path: string): void {
        window.scrollTo(0, 0)
        this.setState({ path, notifications: [] })
    }

}
