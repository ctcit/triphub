import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import { Role, ITrip } from './Interfaces';
import { Trip } from './Trip';
import { TripsList } from './TripsList';
import { Calendar } from './Calendar';
import { TitleFromId } from './Utilities';
import { TriphubNavbar } from './TriphubNavBar';
import { Newsletter } from './Newsletter/Newsletter';
import { PastTrips } from './PastTrips';
import { Spinner, Done } from './Widgets';
import { INotification, NotificationArea } from './NotificationArea';
import { ManageRoutes } from './ManageRoutes/ManageRoutes';
import { ManageMileageRates } from './ManageMileageRates';
import { ManageDestinations } from './ManageDestinations';
import { ConfigService } from './Services/ConfigService';
import { MapsService } from './Services/MapsService';
import { HolidaysService } from './Services/HolidaysService';
import { MembersService } from './Services/MembersService';
import { Alert, Button, Container, FormText, Modal, ModalBody, ModalHeader, Row } from 'reactstrap';
import { Workbox } from 'workbox-window';
import { Login } from './Login';
import { SilentLogin } from './SilentLogin';
import { ToastContainer } from 'react-toastify';

export class App extends Component<{
}, {
    path: string
    isLoadingConfig: boolean
    isLoadingMembers: boolean
    isLoadingLoginStatus: boolean
    isLoadingHolidays: boolean
    isLoadingMaps: boolean
    role: Role
    statusId?: any
    notifications: INotification[]
    isOnline: boolean
    isStandalone: boolean
    backgroundSyncSupported: boolean
    backgroundSyncPermitted: boolean
    appUpdateAvailable: boolean
    cachedTrips: ITrip[]
    pendingSyncsCount: number
    installAppPrompted: boolean
    installStandalone: boolean
}> {

    private onDoAppUpdate = () => {}
    private beforeInstallPrompt: any = null;
    
    constructor(props: any) {
        super(props)

        // determine if app is running standalone or not
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        console.log(isStandalone ? 'app is standalone' : 'app is not standalone')

        const isOnline = navigator.onLine
        let path = window.top?.location.hash.replace('#', '') ?? ''
        const installStandalone = this.parsePath(path).route === 'installStandalone'
        path = installStandalone ? '' : path

        this.state = {
            path: path,
            isLoadingConfig: true,
            isLoadingMembers: true,
            isLoadingLoginStatus: isStandalone && isOnline,
            isLoadingHolidays: true,
            isLoadingMaps: true,
            role: Role.NonMember,
            notifications: [],
            isOnline: isOnline,
            isStandalone: isStandalone,
            backgroundSyncSupported: true,
            backgroundSyncPermitted: false,
            appUpdateAvailable: false,
            cachedTrips: [],
            pendingSyncsCount: 0,
            installAppPrompted: false,
            installStandalone: installStandalone
        }

        if (window.top) {
            window.top.onpopstate = this.onPopState.bind(this)
        }

        // add event handlers to listen for changes in online/offline status 
        window.addEventListener('offline', () => {
                console.log('app is offline')
                this.onOffline()
            }
        );
        window.addEventListener('online', () => {
                console.log('app is online')
                this.onOnline()
            }
        );

        // capture the event that prompts to install the app as standalone
        // We use this to implement the "Install app for standalone/offline use..." option
        window.addEventListener('beforeinstallprompt', (event: any) => { 
                event.preventDefault()
                this.beforeInstallPrompt = event
                console.log('got beforeinstallprompt event')
             }
        );

        // determine if the app is running standalone or not
        window.matchMedia('(display-mode: standalone)').addEventListener('change', ({ matches }) => {
            if (matches) {
                console.log('app is standalone')
                this.setState({isStandalone: true});
            } else {
                console.log('app is not standalone')
                this.setState({isStandalone: false});
            }
        });

        // determine if the background-sync permission is granted and create event listener to listen for changes
        const permissionName = 'background-sync' as PermissionName
        navigator.permissions.query({name: permissionName}).then((permissionStatus) => {
            console.log('backgroundSyncPermitted is ' + (permissionStatus.state === 'granted'))
            this.setState({backgroundSyncPermitted: permissionStatus.state === 'granted'})
            permissionStatus.addEventListener('change', (e) => {
                this.setState({backgroundSyncPermitted: permissionStatus.state === 'granted'}, () => {
                    if (permissionStatus.state === 'granted') {
                        this.conditionallyDoSync() // force a sync now; otherwise it might not happen until the user goes offline then back online again
                    }
                })
            });
        }).catch((ex: any) => {
            if (ex instanceof TypeError) {
                console.log('Could not get backround-sync permission - probably not supported by browser')
                this.setState({ backgroundSyncSupported: false })
            } else {
                throw ex
            }
        })

        // add handling for application update
        console.log('environment = ' + process.env.NODE_ENV)
        if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
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


            navigator.serviceWorker.addEventListener("message", (event) => {
                // event is a MessageEvent object
                if (event.data) {
                    if (event.data.type === 'SYNCS_COUNT') {
                        const pendingSyncsCount = event.data.count ?? 0
                        this.setState({pendingSyncsCount}, () => {
                            this.conditionallyDoSync()
                        })
                    }
                }
            });
            this.getSyncsCount()
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

    private onLoginStatusLoaded() : void {
        this.setState({role: MembersService.Me.role, isLoadingLoginStatus: false})
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
                    <div key={f}>{state[f] ? Spinner : Done} {TitleFromId(f.substring(2))}</div>
                )}
            </div>
        </Container>
    }

    public render() {
        const {route, id} = this.parsePath(this.state.path)
        const rendering = this.isLoading ? 'loading' : route

        const setPath = (path: string) => this.setPath(path)
        const setRole = (role: Role) => this.setState({role})
        const setCachedTrips = (cachedTrips: ITrip[]) => this.setCachedTrips(cachedTrips)
        const addCachedTrip = (cachedTrip: ITrip) => this.addCachedTrip(cachedTrip)
        const addNotification = (text:string, colour: string) => this.addNotification(text, colour)
        const loadingStatus = (state?: any) => this.loadingStatus(state)
        const onDoAppUpdate = () => this.onDoAppUpdate()
        const onCacheTripsChanged = () => this.onCacheTripsChanged()
        const onLoginStatusLoaded = () => this.onLoginStatusLoaded()
        const installStandalone = () => this.installStandalone()

        const onDismissInstallStandalone = () => this.setState({installStandalone: false})

        const common = {
            role: this.state.role,
            setPath,
            addNotification,
            loadingStatus,
            isOnline: this.state.isOnline,
            isCached: id !== undefined && Boolean(this.state.cachedTrips.find(ct => ct.id === id)),
            setCachedTrips,
            addCachedTrip
        }
        const renderings = {
            loading: () => this.loadingStatus(),
            calendar: () => <Calendar key='calendar' {...common} />,
            newtrip: () => <Trip key='newTrip' isNew={true} isNewSocial={false} {...common} />,
            newsocial: () => <Trip key='newSocial' isNew={true} isNewSocial={true} {...common} />,
            newsletter: () => <Newsletter key='newsletter' {...common} />,
            routes: () => <ManageRoutes key='routes' />,
            mileageRates: () => <ManageMileageRates key='mileageRates' {...common}/>,
            destinations: () => <ManageDestinations key='destinations' {...common}/>,
            trips: () => <Trip key={'trip-' + id} isNew={false} isNewSocial={true} id={id} {...common} />,
			pasttrips: () => <PastTrips key='pasttrips' {...common} />,
            login: () => <Login key='login' {...common} />,
            default: () => <TripsList key='default' {...common}/>,
        }

        return [
            <div key='toastContainer'>
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                    />
            </div>
            ,
            (!this.state.isOnline && 
                <Alert key='noInternetAlert' color='warning'>
                    <span className='fa fa-cloud' />
                    &nbsp;<b>No internet connection. Application is working offline. Limited options available.</b>
                </Alert>
            ),
            (!this.state.isOnline && this.state.pendingSyncsCount > 0 && 
                <Alert key='editsPendingAlert' color='warning'>
                    <span className='fa fa-rotate' />
                    &nbsp;<b>Edits ({this.state.pendingSyncsCount}) are waiting to be synced. {(this.state.backgroundSyncPermitted ?
                        'These will automatically sync in the background when next online' :
                        'These will automatically sync when the app is next online.')}</b>
                </Alert>
            ),
            (this.state.isOnline && this.state.pendingSyncsCount > 0 && 
                <Alert key='editsSyncingAlert' color='warning'>
                    <span className='fa fa-rotate fa-spin' />
                    &nbsp;<b>Edits ({this.state.pendingSyncsCount}) are syncing...</b>
                </Alert>
            ),
            (this.state.appUpdateAvailable &&
                <Alert key='updateAlert' color='warning'>
                    <span className='fa fa-refresh' />
                    <b>&nbsp;An application update is available.  Please save any changes, then click the 'Update now' button to update.&nbsp;</b>
                    <Button onClick={onDoAppUpdate}>Update now</Button>
                </Alert>
            ),
            (this.state.installStandalone &&
                <Alert key='installStandaloneAlert' color='warning' toggle={onDismissInstallStandalone}>
                    <span className='fa fa-cloud-arrow-down' />
                    <b>&nbsp;App is {this.beforeInstallPrompt === null ? 'already installed standalone (or not supported by browser)' : 'not installed standalone'}&nbsp;</b>
                        {this.beforeInstallPrompt !== null && 
                            <Button disabled={this.state.installAppPrompted} 
                                onClick={installStandalone}>Install</Button>
                        }

                </Alert>
            ),

            <TriphubNavbar key='triphubNavbar' 
                role={this.state.role}
                path={this.state.path}
                isLoading={this.isLoading}
                isOnline={this.state.isOnline}
                isStandalone={this.state.isStandalone}
                backgroundSyncSupported={this.state.backgroundSyncSupported}
                backgroundSyncPermitted={this.state.backgroundSyncPermitted}
                cachedTrips={this.state.cachedTrips}
                beforeInstallPrompt={this.beforeInstallPrompt}
                setPath={setPath}
                setRole={setRole}
                onCacheTripsChanged={onCacheTripsChanged}
            />,
            <NotificationArea notifications={this.state.notifications} key='notificationArea'
                containerClassName={ConfigService.containerClassName} 
            />,
            (renderings[rendering] ?? renderings.default)(),
            (this.state.isLoadingLoginStatus && <SilentLogin onLoaded={onLoginStatusLoaded}/>
            )
        ]
    }

    private parsePath(path: string): {route: string, id: number | undefined} {
        const pathParts = `${path}/`.split('/')
        const route = pathParts[1]
        const id = pathParts[2] ? parseInt(pathParts[2], 10) : undefined
        return {route, id}
    }

    private changePath(path: string): void {
        window.scrollTo(0, 0)
        this.setState({ path, notifications: [] })
    }

    private async activeServiceWorker(): Promise<ServiceWorker | null> {
        return navigator.serviceWorker.ready.then((registration) => registration.active)
    }

    private async onCacheTripsChanged(): Promise<any> {
        // add handling to notify service worker when the cacheTrips setting has changed in the IndexedDB
        return this.activeServiceWorker().then(sw => sw?.postMessage({ type: 'UPDATE_CACHE_TRIP_SETTING'}));
    }    
    
    private async onDoSync() {
        return this.activeServiceWorker().then(sw => sw?.postMessage({ type: 'DO_SYNCS'}))
    }

    private async conditionallyDoSync() {
        console.log('backgroundSyncPermitted=' + this.state.backgroundSyncPermitted + ', isOnline=' + this.state.isOnline + ', pendingSyncsCount=' + this.state.pendingSyncsCount)
        if (!this.state.backgroundSyncPermitted && this.state.isOnline && this.state.pendingSyncsCount > 0) {
            console.log('doing app initiated sync')
            this.onDoSync() // force a sync now as background sync is disabled
        }
    }

    private async getSyncsCount() {
        this.activeServiceWorker().then(sw => sw?.postMessage({ type: 'GET_SYNCS_COUNT'}));
    }

    private onOnline(): void {
        this.setState( { isOnline: true }, () => {
            this.conditionallyDoSync()
        })
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

    private setCachedTrips(cachedTrips: ITrip[]) {
        this.setState({ cachedTrips })
    }

    private addCachedTrip(cachedTrip: ITrip) {
        if (!this.state.cachedTrips.find(trip => trip.id === cachedTrip.id)) {
            this.setState({ cachedTrips: this.state.cachedTrips.concat(cachedTrip)})
        }
    }

    private installStandalone() {
        if (this.beforeInstallPrompt !== null) {
            this.beforeInstallPrompt.prompt()
            this.beforeInstallPrompt = null
            this.setState({ installStandalone: false, installAppPrompted: true })
        }
    }

}
