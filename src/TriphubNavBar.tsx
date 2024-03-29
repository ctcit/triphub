import { Component } from 'react'
import { ITrip, Role } from './Interfaces'
import { NavItem, NavLink, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Navbar, Nav, Modal, ModalBody, ModalHeader, FormText } from 'reactstrap'
import ReactDOM from 'react-dom'
import { TripsCache } from './Services/TripsCache'
import { UserSettings } from './Services/UserSettings'
import { MembersService } from './Services/MembersService'
import { MdInfo } from 'react-icons/md'

export const PriorityNavItem = (props: any) => {
    const el: HTMLElement | null = document.getElementById('priority-nav-items')
    return (el !== null) ? ReactDOM.createPortal(props.children, el) : null
}

export class TriphubNavbar extends Component<{
    role: Role,
    path: string,
    isLoading: boolean,
    isOnline: boolean,
    isStandalone: boolean,
    backgroundSyncSupported: boolean,
    backgroundSyncPermitted: boolean,
    cachedTrips: ITrip[],
    beforeInstallPrompt: any,
    setPath: (path: string) => void,
    setRole: (role: Role) => void,
    onCacheTripsChanged: () => Promise<any>,
    children?: React.ReactNode,
    isSocial: boolean
    },{
        newDropdownIsOpen: boolean,
        manageDropdownIsOpen: boolean,
        workOfflineDropdownIsOpen: boolean,
        currentUserDropdownIsOpen: boolean,
        windowWidth: number,
        installAppPrompted: boolean,
        cacheTrips: boolean,
        standaloneOfflineInfoOpen: boolean
    }> {
    private inIframe = window.location !== window.parent.location;

    constructor(props: any){
        super(props)
        this.state = {
            newDropdownIsOpen: false,
            manageDropdownIsOpen: false,
            workOfflineDropdownIsOpen: false,
            currentUserDropdownIsOpen: false,
            windowWidth: window.innerWidth,
            installAppPrompted: false,
            cacheTrips: false,
            standaloneOfflineInfoOpen: false
        }

        UserSettings.getCacheTrips().then((value: boolean) => {
            console.log('cacheTrips user settings is ' + value)
            this.setState({ cacheTrips: value })
        })
    }

    public componentDidMount() {
        window.addEventListener("resize", this.setWidth)
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", () => this.setWidth)
    }

    public render() {

        const alltrips = () => this.props.setPath('/')
        const calendar = () => this.props.setPath('/calendar')
        const pasttrips = () => this.props.setPath('/pasttrips')
        const newTrip = () => this.props.setPath('/newtrip')
        const copyCurrentTrip = () => this.props.setPath('/newtrip/' + onTripsPageId)
        const newsletter = () => this.props.setPath('/newsletter')
        const newSocial = () => this.props.setPath('/newsocial')
        const copyCurrentSocial = () => this.props.setPath('/newsocial/' + onTripsPageId)
        const routes = () => this.props.setPath('/routes')
        const mileageRates = () => this.props.setPath('/mileageRates')
        const destinations = () => this.props.setPath('/destinations')
        const login = () => this.props.setPath('/login')

        const onAllTripsPage = this.props.path === '' || this.props.path === '/'
        const onCalendarPage = this.props.path === '/calendar'
        const onPastTripsPage = this.props.path === '/pasttrips'
        // const onNewPage = this.props.path === '/newtrip' || this.props.path === '/newSocial'
        const onTripsPage = this.props.path.startsWith('/trips/')
        const onTripsPageId = onTripsPage ? parseInt(this.props.path.slice('/trips/'.length)) : -1
        const onManageNewsletterPage = this.props.path === '/newsletter'
        const onManageRoutesPage = this.props.path === '/routes'
        const onManageMileageRatesPage = this.props.path === '/mileageRates'
        const onManageDestinationsPage = this.props.path === '/destinations'

        const setAdminPrivileges = () => this.props.setRole(Role.Admin)
        const setTripLeaderPrivileges = () => this.props.setRole(Role.TripLeader)
        const setMemberPrivileges = () => this.props.setRole(Role.Member)
        const setNonMemberPrivileges = () => this.props.setRole(Role.NonMember)

        const toggleNewTripDropdown = () => this.setState({newDropdownIsOpen: !this.state.newDropdownIsOpen});

        const toggleManageDropdown = () => this.setState({manageDropdownIsOpen: !this.state.manageDropdownIsOpen});

        const toggleWorkOfflineDropdown = () => this.setState({workOfflineDropdownIsOpen: !this.state.workOfflineDropdownIsOpen});
        const installStandalone = () => this.installStandalone()
        const startCachingTrips = () => this.startCachingTrips()
        const stopCachingTrips = () => this.stopCachingTrips()
        const onCachedTripClick = (e: any) => this.onCachedTripClick(e.currentTarget.value)

        const toggleCurrentUserDropdown = () => this.setState({currentUserDropdownIsOpen: !this.state.currentUserDropdownIsOpen});
        const loggedIn = this.props.role > Role.NonMember
        const currentUser = MembersService.Me
        const isWebmaster = this.props.role >= Role.Webmaster
        const isAdmin = this.props.role >= Role.Admin

        const toggleStandaloneOfflineInfo = () => this.setState({standaloneOfflineInfoOpen: !this.state.standaloneOfflineInfoOpen})

        return (
            <Navbar className='triphub-navbar' expand={false}>
                <Nav className="mr-auto" justified={false} fill={false} >
                    {!onAllTripsPage &&
                        <NavItem key='alltrips'>
                            <NavLink onClick={alltrips} disabled={this.props.isLoading}>
                                <span className='triphub-navbar-item'>
                                    <span className='fa fa-bars'/>
                                    &nbsp; All trips
                                </span>
                            </NavLink>
                        </NavItem>
                    }
                    {!onCalendarPage &&
                        <NavItem key='calendar'>
                            <NavLink onClick={calendar} disabled={this.props.isLoading}>
                                <span className='triphub-navbar-item'>
                                    <span className='fa fa-calendar'/>
                                    &nbsp; Calendar
                                </span>
                            </NavLink>
                        </NavItem>
                    }
                    <div id='priority-nav-items' />
                    {this.props.isOnline && this.props.role >= Role.Member && !onPastTripsPage && 
                        <NavItem key='pasttrips'>
                            <NavLink onClick={pasttrips} disabled={this.props.isLoading}>
                                <span className='triphub-navbar-item'>
                                    <span className='fa fa-search' />
                                    &nbsp; Past Trips
                                </span>
                            </NavLink>
                        </NavItem>
                    }
                    {this.props.isOnline && this.props.role >= Role.TripLeader &&
                        <Dropdown key='newTrip' nav={true} isOpen={this.state.newDropdownIsOpen} toggle={toggleNewTripDropdown}>
                        <DropdownToggle className='triphub-navbar-item' nav={true} caret={false}>
                            <span className='fa fa-lightbulb'/>
                            &nbsp; New
                        </DropdownToggle>
                        <DropdownMenu color='primary'>
                            <DropdownItem disabled={this.props.isLoading} onClick={newTrip}>
                                <span><span className='fa fa-hiking'/>&nbsp; New Trip</span>
                            </DropdownItem>
                            <DropdownItem disabled={this.props.isLoading || !onTripsPage || this.props.isSocial} onClick={copyCurrentTrip}>
                                <span><span className='fa fa-hiking'/>&nbsp; Copy Current Trip</span>
                            </DropdownItem>
                            {this.props.isOnline && isAdmin && 
                                <>
                                    <DropdownItem divider></DropdownItem>
                                    <DropdownItem disabled={this.props.isLoading} onClick={newSocial}>
                                        <span><span className='fa fa-users' />&nbsp; New Social Event</span>
                                    </DropdownItem>
                                    <DropdownItem disabled={this.props.isLoading || !onTripsPage || !this.props.isSocial} onClick={copyCurrentSocial}>
                                        <span><span className='fa fa-users' />&nbsp; Copy Current Social Event</span>
                                    </DropdownItem>
                                </>
                            }

                        </DropdownMenu>
                    </Dropdown>
                    }
                    {this.props.isOnline && isAdmin &&
                        <Dropdown key='manage' nav={true} isOpen={this.state.manageDropdownIsOpen} toggle={toggleManageDropdown}>
                            <DropdownToggle className='triphub-navbar-item' nav={true} caret={false}>
                                <span className='fa fa-tasks'/>
                                &nbsp; Manage
                            </DropdownToggle>
                            <DropdownMenu color='primary'>
                                <DropdownItem disabled={onManageNewsletterPage} onClick={newsletter}>
                                    <span><span className='fa fa-newspaper'/>&nbsp; Manage Newsletter</span>
                                </DropdownItem> 
                                <DropdownItem disabled={onManageRoutesPage} onClick={routes}>
                                    <span><span className='fa fa-map'/>&nbsp; Manage Routes</span>
                                </DropdownItem> 
                                <DropdownItem disabled={onManageMileageRatesPage} onClick={mileageRates}>
                                    <span><span className='fa fa-dollar-sign'/>&nbsp; Manage Mileage Rates</span>
                                </DropdownItem> 
                                <DropdownItem disabled={onManageDestinationsPage} onClick={destinations}>
                                    <span><span className='fa fa-flag-checkered'/>&nbsp; Manage Destinations</span>
                                </DropdownItem> 
                            </DropdownMenu>
                        </Dropdown>
                    }
                </Nav>
                <Nav className="mr-auto" justified={false} fill={false}>
                    {this.props.role >= Role.Member &&
                        <Dropdown key='workOffline' nav={true} isOpen={this.state.workOfflineDropdownIsOpen} toggle={toggleWorkOfflineDropdown}>
                            <DropdownToggle className='triphub-navbar-item' nav={true} caret={false}>
                                <span className='fa fa-cloud'/> 
                                &nbsp;{this.props.cachedTrips.length ? (' (' + this.props.cachedTrips.length + ')') : ''}
                            </DropdownToggle>
                            <DropdownMenu color='primary'>
                                <DropdownItem onClick={toggleStandaloneOfflineInfo}>Standalone/offline info...</DropdownItem>
                                <Modal isOpen={this.state.standaloneOfflineInfoOpen} toggle={toggleStandaloneOfflineInfo}
                                    size="md" centered={false}>
                                    <ModalHeader toggle={toggleStandaloneOfflineInfo}>Standalone/Offline Info</ModalHeader>
                                    <ModalBody>
                                        <div><FormText disabled={!this.props.isOnline}>
                                            <a href="https://youtu.be/KJjq5YENfUY" target="_blank">
                                                <MdInfo size="36" color="#6899e4" style={{padding: '7px'}}/>
                                                Standalone/offline tutorial
                                            </a>
                                        </FormText></div>
                                        <hr/>
                                        <div><FormText>App is {this.props.isOnline ? 'online' : 'offline'}</FormText></div>
                                        <hr/>
                                        <div><FormText>App is currently running {this.props.isStandalone ? 'standalone' : 'in a browser'}</FormText></div>
                                        {!this.props.isStandalone && 
                                            <div><FormText>Standalone app is {this.props.beforeInstallPrompt === null ? 
                                                'installed (or not supported by browser)' : 'not installed'}</FormText>
                                            </div>
                                        }
                                        <hr/>
                                        <div><FormText>Background sync is {this.props.backgroundSyncSupported ? 'supported' : 'not supported'} by the browser</FormText></div>
                                        {this.props.backgroundSyncSupported && 
                                            <div><FormText>Background sync permission is {this.props.backgroundSyncPermitted ? 'enabled' : 'disabled'} for the tramping club website</FormText></div>
                                        }
                                        <hr/>
                                        <div><FormText>Trips are {this.state.cacheTrips ? '' : 'not '}being cached</FormText></div>
                                        {this.state.cacheTrips && <div><FormText>{this.props.cachedTrips.length} trips are currently cached</FormText></div>}
                                    </ModalBody>
                                </Modal>
                                <DropdownItem disabled={this.state.installAppPrompted || (!this.inIframe && this.props.beforeInstallPrompt === null)} 
                                    onClick={installStandalone}>Install app for standalone/offline use...</DropdownItem>
                                <DropdownItem divider></DropdownItem>
                                <DropdownItem disabled={!this.props.isOnline || this.state.cacheTrips} onClick={startCachingTrips}>Start caching trips</DropdownItem>
                                <DropdownItem disabled={!this.props.isOnline || !this.state.cacheTrips} onClick={stopCachingTrips}>Stop caching trips</DropdownItem>
                                {this.props.cachedTrips.length > 0 && <DropdownItem divider></DropdownItem>}
                                {this.props.cachedTrips.map((trip: ITrip) => { 
                                    return <DropdownItem value={trip.id} onClick={onCachedTripClick}>{trip.title}</DropdownItem> 
                                })}
                            </DropdownMenu>
                        </Dropdown>
                    }
                    {
                        <Dropdown key='currentUser' nav={true} isOpen={this.state.currentUserDropdownIsOpen} toggle={toggleCurrentUserDropdown}>
                            <DropdownToggle className='triphub-navbar-item' nav={true} caret={false}>
                                <span className='fa fa-user'/> 
                            </DropdownToggle>
                            <DropdownMenu color='primary'>
                                <DropdownItem >{currentUser?.name} ({this.roleToString(this.props.role)})</DropdownItem>
                                {this.props.isStandalone && this.props.isOnline &&
                                    <DropdownItem onClick={login}>{!loggedIn ? 'Log in' : 'Log out' }</DropdownItem>
                                }
                                { isWebmaster && <DropdownItem divider></DropdownItem> }
                                { isWebmaster && <DropdownItem onClick={setAdminPrivileges}>Set as administrator</DropdownItem> }
                                { isWebmaster && <DropdownItem onClick={setTripLeaderPrivileges}>Set as trip leader</DropdownItem> }
                                { isWebmaster && <DropdownItem onClick={setMemberPrivileges}>Set as member</DropdownItem> }
                                { isWebmaster && <DropdownItem onClick={setNonMemberPrivileges}>Set as non-member</DropdownItem> }
                            </DropdownMenu>
                        </Dropdown>
                    }
                </Nav>
            </Navbar>
        )
    }

    private setWidth = () => this.setState({ windowWidth: window.innerWidth })

    private installStandalone() {
        if (this.props.beforeInstallPrompt !== null) {
            this.props.beforeInstallPrompt.prompt()
            this.setState({ installAppPrompted: true })
        } else {
            // in iframe - open a new tab of the site not in an iframe
            let src = (window.frameElement as any)?.src
            if (src) {
                src = src + '#/installStandalone'
                window.open(src)
            }
        }
    }

    private startCachingTrips() {
        UserSettings.setCacheTrips(true).then(() => {
            this.props.onCacheTripsChanged().then(() => {
                // go back to main trips list and reload to ensure we cache all basic data
                this.props.setPath('/')
                window.location.reload()
            })
        })
    }

    private stopCachingTrips() {
        UserSettings.setCacheTrips(false).then(() => {
            this.props.onCacheTripsChanged().then(() => {
                TripsCache.clear()
                // reload to update cached trips UI
                window.location.reload()
            })
        })
    }

    public onCachedTripClick(tripId: any) {
        this.props.setPath('/trips/' + tripId)
    }

    private roleToString(role: Role): string {
        switch (role) {
            case Role.NonMember: return 'Non-member'
            case Role.Member: return 'Member'
            case Role.TripLeader: return 'Trip leader'
            case Role.Admin: return 'Administrator'
            case Role.Webmaster: return 'Web master'
            default: return ''
        }
    }
}
