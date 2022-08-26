import { Component } from 'react'
import * as React from 'react'
import { App } from './App'
import Navbar from 'reactstrap/lib/Navbar'
import { Role } from './Interfaces'
import Nav from 'reactstrap/lib/Nav'
import NavbarBrand from 'reactstrap/lib/NavbarBrand'
import NavbarToggler from 'reactstrap/lib/NavbarToggler'
import Collapse from 'reactstrap/lib/Collapse'
import NavLink from 'reactstrap/lib/NavLink'
import NavItem from 'reactstrap/lib/NavItem'
import DropdownToggle from 'reactstrap/lib/DropdownToggle'
import DropdownMenu from 'reactstrap/lib/DropdownMenu'
import DropdownItem from 'reactstrap/lib/DropdownItem'
import Dropdown from 'reactstrap/lib/Dropdown'
import * as ReactDOM from 'react-dom'
import { ConfigService } from './Services/ConfigService'

export const PriorityNavItem = (props: any) => {  
    const el: HTMLElement|null = document.getElementById('priority-nav-items') 
    return (el !== null) ? ReactDOM.createPortal( props.children, el ) : null
}

export class TriphubNavbar extends Component<{
    app: App
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

        const alltrips = () => this.props.app.setPath('/')
        const calendar = () => this.props.app.setPath('/calendar')
        const newtrip = () => this.props.app.setPath('/newtrip')
        const newsletter = () => this.props.app.setPath('/newsletter')
        const newsocial = () => this.props.app.setPath('/newsocial')
        const routes = () => this.props.app.setPath('/routes')
        const toggle = () => this.setState({isOpen: !this.state.isOpen});
        const togglePriviledgesDropdown = () => this.setState({priviledgesDropdownIsOpen: !this.state.priviledgesDropdownIsOpen});
        const setAdminPrivileges = () => this.props.app.setState({role:Role.Admin})
        const setTripLeaderPrivileges = () => this.props.app.setState({role:Role.TripLeader})
        const setMemberPrivileges = () => this.props.app.setState({role:Role.Member})
        const setNonMemberPrivileges = () => this.props.app.setState({role:Role.NonMember})

        const navItems: JSX.Element[] = []

        if (ConfigService.inIFrame && this.props.app.state.path !== '' && this.props.app.state.path !== '/') {
            navItems.push(
            <NavItem key='alltrips'>
                <NavLink onClick={alltrips} disabled={this.props.app.isLoading}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-bars'/>
                        &nbsp; All trips
                    </span>
                </NavLink>
            </NavItem>)
        }

        if (this.props.app.state.path !== '/calendar') {
            navItems.push(
            <NavItem key='calendar'>
                <NavLink onClick={calendar} disabled={this.props.app.isLoading}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-calendar'/>
                        &nbsp; Calendar
                    </span>
                </NavLink>
            </NavItem>)
        }

        navItems.push(<div id='priority-nav-items' key='prioritynavitems'/>)
        
        if (this.props.app.state.role >= Role.TripLeader && this.props.app.state.path !== '/newtrip') {
            navItems.push(
            <NavItem key='newTrip'>
                <NavLink onClick={newtrip} disabled={this.props.app.isLoading}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-lightbulb'/> 
                        &nbsp; New trip
                    </span>
                </NavLink>
            </NavItem>)
        }
    
        if (this.props.app.state.role >= Role.Admin && this.props.app.state.path !== '/newsletter') {
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

        if (this.props.app.state.role >= Role.Admin && this.props.app.state.path !== '/newSocial') {
            navItems.push(
            <NavItem key='addASocialEvent'>
                <NavLink onClick={newsocial} disabled={this.props.app.isLoading}>
                    <span className='triphub-navbar'>
                        <span className='fa fa-users'/> 
                        &nbsp; Add a social event
                    </span>
                </NavLink>
            </NavItem>)
        }

        if (this.props.app.state.role >= Role.Admin && this.props.app.state.path !== '/routes') {
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

        if (this.props.app.state.role >= Role.Webmaster) {
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
