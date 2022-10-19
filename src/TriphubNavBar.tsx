import { Component } from 'react'
import { ITrip, Role } from './Interfaces'
import { ConfigService } from './Services/ConfigService'
import { NavItem, NavLink, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Navbar, NavbarBrand, Nav, NavbarToggler, Collapse } from 'reactstrap'
import ReactDOM from 'react-dom'
import { TripsCache } from './Services/TripsCache'
import { UserSettings } from './Services/UserSettings'

export const PriorityNavItem = (props: any) => {  
    const el: HTMLElement|null = document.getElementById('priority-nav-items') 
    return (el !== null) ? ReactDOM.createPortal( props.children, el ) : null
}

export class TriphubNavbar extends Component<{
    role: Role,
    path: string,
    isLoading: boolean,
    isOnline: boolean,
    cachedTrips: ITrip[],
    beforeInstallPrompt: any,
    setPath: (path: string) => void,
    setRole: (role: Role) => void,
    onCacheTripsChanged: () => Promise<any>,
    children?: React.ReactNode
    },{
        isOpen: boolean,
        priviledgesDropdownIsOpen: boolean,
        workOfflineDropdownIsOpen: boolean,
        windowWidth: number,
        installAppPrompted: boolean,
        cacheTrips: boolean
    }> {

    constructor(props: any){
        super(props)
        this.state = {
            isOpen: false,
            priviledgesDropdownIsOpen: false,
            workOfflineDropdownIsOpen: false,
            windowWidth: window.innerWidth,
            installAppPrompted: false,
            cacheTrips: false
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
        const newtrip = () => this.props.setPath('/newtrip')
        const newsletter = () => this.props.setPath('/newsletter')
        const newsocial = () => this.props.setPath('/newsocial')
        const routes = () => this.props.setPath('/routes')
        const toggle = () => this.setState({isOpen: !this.state.isOpen});

        const togglePriviledgesDropdown = () => this.setState({priviledgesDropdownIsOpen: !this.state.priviledgesDropdownIsOpen});
        const setAdminPrivileges = () => this.props.setRole(Role.Admin)
        const setTripLeaderPrivileges = () => this.props.setRole(Role.TripLeader)
        const setMemberPrivileges = () => this.props.setRole(Role.Member)
        const setNonMemberPrivileges = () => this.props.setRole(Role.NonMember)

        const toggleWorkOfflineDropdown = () => this.setState({workOfflineDropdownIsOpen: !this.state.workOfflineDropdownIsOpen});
        const installApp = () => this.installApp()
        const startCachingTrips = () => this.startCachingTrips()
        const stopCachingTrips = () => this.stopCachingTrips()
        const onCachedTripClick = (e: any) => this.onCachedTripClick(e.currentTarget.value)

        const navItems: JSX.Element[] = []

        if (ConfigService.inIFrame && this.props.path !== '' && this.props.path !== '/') {
            navItems.push(
            <NavItem key='alltrips'>
                <NavLink onClick={alltrips} disabled={this.props.isLoading}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-bars'/>
                        &nbsp; All trips
                    </span>
                </NavLink>
            </NavItem>)
        }

        if (this.props.path !== '/calendar') {
            navItems.push(
            <NavItem key='calendar'>
                <NavLink onClick={calendar} disabled={this.props.isLoading}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-calendar'/>
                        &nbsp; Calendar
                    </span>
                </NavLink>
            </NavItem>)
        }

        navItems.push(<div id='priority-nav-items' key='prioritynavitems'/>)
        
        if (this.props.isOnline && this.props.role >= Role.TripLeader && this.props.path !== '/newtrip') {
            navItems.push(
            <NavItem key='newTrip'>
                <NavLink onClick={newtrip} disabled={this.props.isLoading}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-lightbulb'/> 
                        &nbsp; New trip
                    </span>
                </NavLink>
            </NavItem>)
        }
    
        if (this.props.isOnline && this.props.role >= Role.Admin && this.props.path !== '/newsletter') {
            navItems.push(
            <NavItem key='manageNewsletter'>
                <NavLink onClick={newsletter}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-newspaper'/> 
                        &nbsp; Manage Newsletter
                    </span>
                </NavLink>
            </NavItem>)
        }

        if (this.props.isOnline && this.props.role >= Role.Admin && this.props.path !== '/newSocial') {
            navItems.push(
            <NavItem key='addASocialEvent'>
                <NavLink onClick={newsocial} disabled={this.props.isLoading}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-users'/> 
                        &nbsp; Add a social event
                    </span>
                </NavLink>
            </NavItem>)
        }

        if (this.props.isOnline && this.props.role >= Role.Admin && this.props.path !== '/routes') {
            navItems.push(
            <NavItem key='manageRoutes'>
                <NavLink onClick={routes}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-map'/> 
                        &nbsp; Manage Routes
                    </span>
                </NavLink>
            </NavItem>)
        }

        if (this.props.role >= Role.Member && (this.props.path === '' || this.props.path === '/' || this.props.path === '/calendar')) {
            navItems.push(
            <Dropdown key='workOffline' nav={true} isOpen={this.state.workOfflineDropdownIsOpen} toggle={toggleWorkOfflineDropdown}>
                <DropdownToggle className='triphub-navbar' nav={true} caret={true}>
                    <span className='fa fa-cloud'/> 
                    &nbsp; Work Offline{this.props.cachedTrips.length ? (' (' + this.props.cachedTrips.length + ')') : ''}
                </DropdownToggle>
                <DropdownMenu color='primary'>
                    <DropdownItem disabled={this.state.installAppPrompted || this.props.beforeInstallPrompt === null} 
                        onClick={installApp}>Install app for standalone/offline use...</DropdownItem>
                    <DropdownItem disabled={this.state.cacheTrips} onClick={startCachingTrips}>Start caching trips</DropdownItem>
                    <DropdownItem disabled={!this.state.cacheTrips} onClick={stopCachingTrips}>Stop caching trips</DropdownItem>
                    {this.props.cachedTrips.length > 0 && <DropdownItem divider></DropdownItem>}
                    {this.props.cachedTrips.map((trip: ITrip) => { 
                        return <DropdownItem value={trip.id} onClick={onCachedTripClick}>{trip.title}</DropdownItem> 
                    })}
                </DropdownMenu>
            </Dropdown>)
        }
        
        if (this.props.role >= Role.Webmaster) {
            navItems.push(
            <Dropdown key='setPrivileges' nav={true} isOpen={this.state.priviledgesDropdownIsOpen} toggle={togglePriviledgesDropdown}>
                <DropdownToggle className='triphub-navbar' nav={true} caret={true}>
                    <span className='fa fa-ban'/> 
                    &nbsp; Set Privileges
                </DropdownToggle>
                <DropdownMenu color='primary'>
                    <DropdownItem onClick={setAdminPrivileges}>Admin</DropdownItem>
                    <DropdownItem onClick={setTripLeaderPrivileges}>TripLeader</DropdownItem>
                    <DropdownItem onClick={setMemberPrivileges}>Member</DropdownItem>
                    <DropdownItem onClick={setNonMemberPrivileges}>NonMember</DropdownItem>
                </DropdownMenu>
            </Dropdown>)
        }

        if (this.props.children as JSX.Element[]) {
            navItems.push(...this.props.children as JSX.Element[])
        }

        // rough calculation of nav items that fit onto the navbar
        const bannerAndToggleApproxWidth = 230
        const navItemAprroxWidth = 170 // 120 - 200px
        const nonCollapsedCount = Math.min(navItems.length, Math.floor(Math.max(0, this.state.windowWidth - bannerAndToggleApproxWidth) / navItemAprroxWidth))
        const nonCollapsableNavItems: JSX.Element[] = ConfigService.inIFrame ? navItems : navItems.slice(0, nonCollapsedCount)
        const collapsableNavItems: JSX.Element[] = ConfigService.inIFrame ? [] : navItems.slice(nonCollapsedCount)
    
        return (
            <Navbar color='primary' expand={false}>
                <NavbarBrand className='triphub-navbar' href="#home" hidden={ConfigService.inIFrame}>
                    <img src="CTCLogo.png" width="40" height="40" className="d-inline-block" />
                    <b>Trips</b>
                </NavbarBrand>
                <Nav className="mr-auto" justified={false} fill={false} >
                    {nonCollapsableNavItems}
                </Nav>
                <NavbarToggler onClick={toggle} hidden={ConfigService.inIFrame || collapsableNavItems.length === 0}/>
                <Collapse  isOpen={this.state.isOpen} navbar={true} hidden={ConfigService.inIFrame}>
                    <Nav className="mr-auto" justified={false} fill={false} >
                        {collapsableNavItems}
                    </Nav>
                </Collapse>
            </Navbar>
        )
    }

    private setWidth = () => this.setState({windowWidth: window.innerWidth})

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
}
