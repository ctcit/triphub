import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import { Role } from './Interfaces';
import { Trip } from './Trip';
import { TripsList } from './TripsList';
import { Calendar } from './Calendar';
import { TitleFromId } from './Utilities';
import { TriphubNavbar } from './TriphubNavBar';
import { Newsletter } from './Newsletter/Newsletter';
import { Spinner, Done } from './Widgets';
import { INotification, NotificationArea } from './NotificationArea';
import { ManageRoutes } from './ManageRoutes/ManageRoutes';
import { ConfigService } from './Services/ConfigService';
import { MapsService } from './Services/MapsService';
import { HolidaysService } from './Services/HolidaysService';
import { MembersService } from './Services/MembersService';
import { Container } from 'reactstrap';

export class App extends Component<{
}, {
    path: string
    isLoadingConfig: boolean
    isLoadingMaps: boolean
    isLoadingMembers: boolean
    isLoadingHolidays: boolean
    role: Role
    statusId?: any
    notifications: INotification[]
}> {
    constructor(props: any) {
        super(props)
        this.state = {
            path: window.top?.location.hash.replace('#', '') ?? '',
            isLoadingConfig: true,
            isLoadingMaps: true,
            isLoadingMembers: true,
            isLoadingHolidays: true,
            role: Role.NonMember,
            notifications: []
        }

        if (window.top) {
            window.top.onpopstate = this.onPopState.bind(this)
        }
    }

    public onPopState(event: PopStateEvent) {
        this.changePath(event.state === null ? '/' : event.state.path)
    }

    public setPath(path: string): void {
        if (window.top) {
            window.top.history.pushState({ path }, path, "#" + path);
        }
        this.changePath(path)
    }

    public componentDidMount(): void {
        MembersService.getMembers(true)
            .then(() => this.setState({ role: MembersService.Me.role, isLoadingMembers: false }));
        ConfigService.getConfig()
            .then(() => this.setState({ isLoadingConfig: false }));
        MapsService.getMaps()
            .then(() => this.setState({ isLoadingMaps: false }));
        HolidaysService.getHolidays()
            .then(() => this.setState({ isLoadingHolidays: false }));
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
    public loadingStatus(state: any = {}): JSX.Element {
        state = { ...this.state, ...state }
        return <Container key='loadingStatus' className={ConfigService.containerClassName + "triphub-loading-container"}>
            <div key='loadingAlert' className="p-5 mb-4 bg-light rounded-3">
                {this.loadingFields(state).map(f =>
                    <div key={f}>{state[f] ? Spinner : Done} {TitleFromId(f.substring(2))}</div>)}
            </div>
        </Container>
    }

    public render() {
        const pathParts = `${this.state.path}/`.split('/')
        const rendering = this.isLoading ? 'loading' : pathParts[1]
        const id = pathParts[2] ? parseInt(pathParts[2], 10) : undefined

        const setPath = (path: string) => this.setPath(path)
        const addNotification = (text:string, colour: string) => this.addNotification(text, colour)
        const loadingStatus = (state?: any) => this.loadingStatus(state)

        const common = {
            role: this.state.role,
            setPath,
            addNotification,
            loadingStatus
        }
        const renderings = {
            loading: () => this.loadingStatus(),
            calendar: () => <Calendar key='calendar' {...common} />,
            newtrip: () => <Trip key='newTrip' isNew={true} isNewSocial={false} {...common} />,
            newsocial: () => <Trip key='newSocial' isNew={true} isNewSocial={true} {...common} />,
            routes: () => <ManageRoutes key='routes' app={this}/>,
            newsletter: () => <Newsletter key='newsletter' app={this} />,
            trips: () => <Trip key='trips' isNew={false} isNewSocial={true} id={id} {...common} />,
            default: () => <TripsList key='default' {...common}/>,
        }

        return [
            <TriphubNavbar key='triphubNavbar' app={this} />,
            <NotificationArea notifications={this.state.notifications} key='notificationArea'
                containerClassName={ConfigService.containerClassName} />,
            (renderings[rendering] || renderings.default)()
        ]
    }

    private changePath(path: string): void {
        window.scrollTo(0, 0)
        this.setState({ path, notifications: [] })
    }
}
