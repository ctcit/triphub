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
    children?: React.ReactNode
    },{
        manageDropdownIsOpen: boolean,
        workOfflineDropdownIsOpen: boolean,
        currentUserDropdownIsOpen: boolean,
        windowWidth: number,
        installAppPrompted: boolean,
        cacheTrips: boolean,
        standaloneOfflineInfoOpen: boolean
    }> {

    constructor(props: any){
        super(props)
        this.state = {
            manageDropdownIsOpen: false,
            workOfflineDropdownIsOpen: false,
            currentUserDropdownIsOpen: false,
            windowWidth: window.innerWidth,
            installAppPrompted: false,
            cacheTrips: false,
            standaloneOfflineInfoOpen: false
        }

        UserSettings.getCacheTrips().then((value: boolean) => {
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
        const newtrip = () => this.props.setPath('/newtrip')
        const newsletter = () => this.props.setPath('/newsletter')
        const newsocial = () => this.props.setPath('/newsocial')
        const routes = () => this.props.setPath('/routes')
        const mileageRates = () => this.props.setPath('/mileageRates')
        const destinations = () => this.props.setPath('/destinations')
        const login = () => this.props.setPath('/login')

        const onAllTripsPage = this.props.path === '' || this.props.path === '/'
        const onCalendarPage = this.props.path === '/calendar'
        const onPastTripsPage = this.props.path === '/pasttrips'
        const onNewTripPage = this.props.path === '/newtrip'
        const onManageNewsletterPage = this.props.path === '/newsletter'
        const onNewSocialPage = this.props.path === '/newSocial'
        const onManageRoutesPage = this.props.path === '/routes'
        const onManageMileageRatesPage = this.props.path === '/mileageRates'
        const onManageDestinationsPage = this.props.path === '/destinations'

        const setAdminPrivileges = () => this.props.setRole(Role.Admin)
        const setTripLeaderPrivileges = () => this.props.setRole(Role.TripLeader)
        const setMemberPrivileges = () => this.props.setRole(Role.Member)
        const setNonMemberPrivileges = () => this.props.setRole(Role.NonMember)

        const toggleManageDropdown = () => this.setState({manageDropdownIsOpen: !this.state.manageDropdownIsOpen});

        const toggleWorkOfflineDropdown = () => this.setState({workOfflineDropdownIsOpen: !this.state.workOfflineDropdownIsOpen});
        const installApp = () => this.installApp()
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
            <Navbar color='primary' expand={false}>
                {/* <NavbarBrand className='triphub-navbar' href="#home" hidden={!this.props.isStandalone}>
                    <img src="CTCLogo.png" width="40" height="40" className="d-inline-block" />
                    <b>Trips</b>
                </NavbarBrand> */}
                <Nav className="mr-auto" justified={false} fill={false} >
                    {!onAllTripsPage &&
                        <NavItem key='alltrips'>
                            <NavLink onClick={alltrips} disabled={this.props.isLoading}>
                                <span className='triphub-navbar'>
                                    <span className='fa fa-bars'/>
                                    &nbsp; All trips
                                </span>
                            </NavLink>
                        </NavItem>
                    }
                    {!onCalendarPage &&
                        <NavItem key='calendar'>
                            <NavLink onClick={calendar} disabled={this.props.isLoading}>
                                <span className='triphub-navbar'>
                                    <span className='fa fa-calendar'/>
                                    &nbsp; Calendar
                                </span>
                            </NavLink>
                        </NavItem>
                    }
                    {this.props.isOnline && this.props.role >= Role.Member && !onPastTripsPage && 
                        <NavItem key='pasttrips'>
                            <NavLink onClick={pasttrips} disabled={this.props.isLoading}>
                                <span className='triphub-navbar'>
                                    <span className='fa fa-search' />
                                    &nbsp; Past Trips
                                </span>
                            </NavLink>
                        </NavItem>
                    }
                    {this.props.isOnline && this.props.role >= Role.TripLeader && !onNewTripPage &&
                        <NavItem key='newTrip'>
                            <NavLink onClick={newtrip} disabled={this.props.isLoading}>
                                <span className='triphub-navbar'>
                                    <span className='fa fa-lightbulb'/> 
                                    &nbsp; New trip
                                </span>
                            </NavLink>
                        </NavItem>
                    }
                    {this.props.isOnline && isAdmin && !onNewSocialPage &&
                        <NavItem key='addASocialEvent'>
                            <NavLink onClick={newsocial} disabled={this.props.isLoading}>
                                <span className='triphub-navbar'>
                                    <span className='fa fa-users'/> 
                                    &nbsp; Add a social event
                                </span>
                            </NavLink>
                        </NavItem>
                    }
                    {this.props.isOnline && isAdmin &&
                        <Dropdown key='manage' nav={true} isOpen={this.state.manageDropdownIsOpen} toggle={toggleManageDropdown}>
                            <DropdownToggle className='triphub-navbar' nav={true} caret={false}>
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
                    {this.props.role >= Role.Member && (onAllTripsPage || onCalendarPage) &&
                        <Dropdown key='workOffline' nav={true} isOpen={this.state.workOfflineDropdownIsOpen} toggle={toggleWorkOfflineDropdown}>
                            <DropdownToggle className='triphub-navbar' nav={true} caret={false}>
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
                                            <a href="https://youtu.be/mF0jPHLjanI" target="_blank">
                                                <MdInfo size="36" color="#6899e4" style={{padding: '7px'}}/>
                                                Standalone/offline tutorial
                                            </a>
                                        </FormText></div>
                                        <hr/>
                                        <div><FormText>App is {this.props.isOnline ? 'online' : 'offline'}</FormText></div>
                                        <hr/>
                                        <div><FormText>Standalone app is {this.props.beforeInstallPrompt === null ? 
                                            this.props.isStandalone ? 'installed' : 'installed (or not supported by browser)' : 'not installed'}</FormText></div>
                                        <div><FormText>App is currently running {this.props.isStandalone ? 'standalone' : 'in a browser'}</FormText></div>
                                        <hr/>
                                        <div><FormText>Background sync is {this.props.backgroundSyncSupported ? 'supported' : 'not supported'} by the browser</FormText></div>
                                        <div><FormText>Background sync permission is {this.props.backgroundSyncPermitted ? 'enabled' : 'disabled'} for the tramping club website</FormText></div>
                                        <hr/>
                                        <div><FormText>Trips caching is {this.state.cacheTrips ? 'enabled' : 'disabled'}</FormText></div>
                                        <div><FormText>{this.props.cachedTrips.length} trips are currently cached</FormText></div>
                                    </ModalBody>
                                </Modal>
                                <DropdownItem disabled={this.state.installAppPrompted || this.props.beforeInstallPrompt === null} 
                                    onClick={installApp}>Install app for standalone/offline use...</DropdownItem>
                                <DropdownItem divider></DropdownItem>
                                <DropdownItem disabled={this.state.cacheTrips} onClick={startCachingTrips}>Start caching trips</DropdownItem>
                                <DropdownItem disabled={!this.state.cacheTrips} onClick={stopCachingTrips}>Stop caching trips</DropdownItem>
                                {this.props.cachedTrips.length > 0 && <DropdownItem divider></DropdownItem>}
                                {this.props.cachedTrips.map((trip: ITrip) => { 
                                    return <DropdownItem value={trip.id} onClick={onCachedTripClick}>{trip.title}</DropdownItem> 
                                })}
                            </DropdownMenu>
                        </Dropdown>
                    }
                    {
                        <Dropdown key='currentUser' nav={true} isOpen={this.state.currentUserDropdownIsOpen} toggle={toggleCurrentUserDropdown}>
                            <DropdownToggle className='triphub-navbar' nav={true} caret={false}>
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

    private installApp() {
        if (this.props.beforeInstallPrompt !== null) {
            this.props.beforeInstallPrompt.prompt()
            this.setState({ installAppPrompted: true })
        }
    }

    private startCachingTrips() {
        UserSettings.setCacheTrips(true).then(() => {
            this.props.onCacheTripsChanged().then(() => {
                window.location.reload();
            })
        })
    }

    private stopCachingTrips() {
        UserSettings.setCacheTrips(false).then(() => {
            this.props.onCacheTripsChanged().then(() => {
                TripsCache.clear()
                window.location.reload();
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
