import { Component } from 'react'
import { Role } from './Interfaces'
import { ConfigService } from './Services/ConfigService'
import { NavItem, NavLink, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Navbar, NavbarBrand, Nav, NavbarToggler, Collapse } from 'reactstrap'
import ReactDOM from 'react-dom'

export const PriorityNavItem = (props: any) => {  
    const el: HTMLElement|null = document.getElementById('priority-nav-items') 
    return (el !== null) ? ReactDOM.createPortal( props.children, el ) : null
}

export class TriphubNavbar extends Component<{
    role: Role,
    path: string,
    isLoading: boolean,
    isOnline: boolean,
    setPath: (path: string) => void,
    setRole: (role: Role) => void,
    children?: React.ReactNode
    },{
        isOpen: boolean,
        priviledgesDropdownIsOpen: boolean,
        windowWidth: number
    }> {
    constructor(props: any){
        super(props)
        this.state = {
            isOpen: false,
            priviledgesDropdownIsOpen: false,
            windowWidth: window.innerWidth
        }
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
}
