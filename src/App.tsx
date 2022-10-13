import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import { Role, ITrip } from './Interfaces';
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
import { Alert, Button, Container } from 'reactstrap';
import { Workbox } from 'workbox-window';

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
    isOnline: boolean
    backgroundSyncPermitted: boolean,
    appUpdateAvailable: boolean,
    cachedTrips: ITrip[]
}> {

    private onDoAppUpdate = () => {}

    constructor(props: any) {
        super(props)
        this.state = {
            path: window.top?.location.hash.replace('#', '') ?? '',
            isLoadingConfig: true,
            isLoadingMaps: true,
            isLoadingMembers: true,
            isLoadingHolidays: true,
            role: Role.NonMember,
            notifications: [],
            isOnline: navigator.onLine,
            backgroundSyncPermitted: false,
            appUpdateAvailable: false,
            cachedTrips: []
        }

        if (window.top) {
            window.top.onpopstate = this.onPopState.bind(this)
        }

        // add event handlers to store online/offline status 
        window.addEventListener('offline', () => {
            this.onOffline()
        });
          
        window.addEventListener('online', () => {
            this.onOnline()
        });

        navigator.permissions.query({name: 'background-sync'} as unknown as PermissionDescriptor).then((permissionStatus) => {
            this.setState({backgroundSyncPermitted: permissionStatus.state === 'granted'})
            permissionStatus.addEventListener('change', (e) => {
                this.setState({backgroundSyncPermitted: permissionStatus.state === 'granted'})
              });
        })

        // add handling for application update
        if ('serviceWorker' in navigator) {
            const wb = new Workbox(`${process.env.PUBLIC_URL}/service-worker.js`);
            let registration;
        
            const showSkipWaitingPrompt = async () => {
              // Assuming the user accepted the update, set up a listener
              // that will reload the page as soon as the previously waiting
              // service worker has taken control.
              wb.addEventListener('controlling', () => {
                // At this point, reloading will ensure that the current
                // tab is loaded under the control of the new service worker.
                // Depending on your web app, you may want to auto-save or
                // persist transient state before triggering the reload.
                window.location.reload();
              });
        
              // When `event.wasWaitingBeforeRegister` is true, a previously
              // updated service worker is still waiting.
              // This code assumes your app has a promptForUpdate() method,
              // which returns true if the user wants to update.
              const updateAccepted = await this.promptForUpdate();
        
              if (updateAccepted) {
                wb.messageSkipWaiting();
              }
            };
        
            // Add an event listener to detect when the registered
            // service worker has installed but is waiting to activate.
            wb.addEventListener('waiting', (event) => {
              showSkipWaitingPrompt();
            });
        
            wb.register();
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
        const setRole = (role: Role) => this.setState({role})
        const setCachedTrips = (cachedTrips: ITrip[]) => this.setState({cachedTrips})
        const addNotification = (text:string, colour: string) => this.addNotification(text, colour)
        const loadingStatus = (state?: any) => this.loadingStatus(state)
        const onDoAppUpdate = () => this.onDoAppUpdate()

        const common = {
            role: this.state.role,
            setPath,
            addNotification,
            loadingStatus,
            isOnline: this.state.isOnline,
            offlineEditsPermitted: this.state.backgroundSyncPermitted,
            setCachedTrips
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
            !this.state.isOnline && 
                <Alert color='warning'>
                    <span className='fa fa-cloud' />
                    &nbsp;<b>No internet connection. Application is working offline. Limited options available.</b>
                </Alert>,
            !this.state.backgroundSyncPermitted && !this.state.isOnline && 
                <Alert color='warning'>
                    <span className='fa fa-rotate' />
                    &nbsp;<b>Background sync is disabled or not supported by your browser.  Consider granting permission (browser dependent) to allow limited offline editing options.</b>
                </Alert>,
            this.state.appUpdateAvailable &&
                <Alert color='warning'>
                    <span className='fa fa-refresh' />
                    <b>&nbsp;An application update is available.  Please save any changes, then click the 'Update now' button to update.&nbsp;</b>
                    <Button onClick={onDoAppUpdate}>Update now</Button>
                </Alert>,
            <TriphubNavbar key='triphubNavbar' 
                role={this.state.role}
                path={this.state.path}
                isLoading={this.isLoading}
                isOnline={this.state.isOnline}
                cachedTrips={this.state.cachedTrips}
                setPath={setPath}
                setRole={setRole}
            />,
            <NotificationArea notifications={this.state.notifications} key='notificationArea'
                containerClassName={ConfigService.containerClassName} 
            />,
            (renderings[rendering] || renderings.default)()
        ]
    }

    private changePath(path: string): void {
        window.scrollTo(0, 0)
        this.setState({ path, notifications: [] })
    }

    private onOnline(): void {
        this.setState( { isOnline: true })
    }

    private onOffline(): void {
        this.setState( { isOnline: false })
    }

    private async promptForUpdate(): Promise<boolean> {
        return new Promise((resolve , reject) => {
            this.onDoAppUpdate = () => {
                this.setState({appUpdateAvailable: false})
                this.onDoAppUpdate = () => {}
                resolve(true)
            }
            this.setState({appUpdateAvailable: true})
        })
    }
}
