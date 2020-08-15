import { Component } from 'react';
import * as React from 'react';
import { App } from './App';
import Navbar from 'reactstrap/lib/Navbar';
import Button from 'reactstrap/lib/Button';
import Fade from 'reactstrap/lib/Fade';
import Badge from 'reactstrap/lib/Badge';
import { Role } from './Interfaces';
import Nav from 'reactstrap/lib/Nav';
import NavbarBrand from 'reactstrap/lib/NavbarBrand';
import NavbarToggler from 'reactstrap/lib/NavbarToggler';
import Collapse from 'reactstrap/lib/Collapse';
import NavLink from 'reactstrap/lib/NavLink';
import NavItem from 'reactstrap/lib/NavItem';
import { UncontrolledDropdown } from 'reactstrap/lib/Uncontrolled';
import DropdownToggle from 'reactstrap/lib/DropdownToggle';
import DropdownMenu from 'reactstrap/lib/DropdownMenu';
import DropdownItem from 'reactstrap/lib/DropdownItem';
import Dropdown from 'reactstrap/lib/Dropdown';

export class TriphubNavbar extends Component<{
    app: App
    },{
        isOpen: boolean,
        priviledgesDropdownIsOpen: boolean
    }> {
    constructor(props: any){
        super(props)
        this.state = {
            isOpen: false,
            priviledgesDropdownIsOpen: false
        }
    }

    public render(){

        const alltrips = () => this.props.app.setPath('/')
        const calendar = () => this.props.app.setPath('/calendar')
        const newtrip = () => this.props.app.setPath('/newtrip')
        const newsletter = () => this.props.app.setPath('/newsletter')
        const newsocial = () => this.props.app.setPath('/newsocial')
        const toggle = () => this.setState({isOpen: !this.state.isOpen});
        const togglePriviledgesDropdown = () => this.setState({priviledgesDropdownIsOpen: !this.state.priviledgesDropdownIsOpen});
        const setAdminPrivileges = () => this.props.app.setState({role:Role.Admin})
        const setTripLeaderPrivileges = () => this.props.app.setState({role:Role.TripLeader})
        const setMemberPrivileges = () => this.props.app.setState({role:Role.Member})
        const setNonMemberPrivileges = () => this.props.app.setState({role:Role.NonMember})
        const me = this.props.app.getMe()

        return (
            <Navbar color='primary' inverse={true} toggleable={true} expand="md">
                <NavbarBrand className='triphub-navbar-brand' href="#home">
                    <img src="/CTCLogo.png" width="40" height="40" className="d-inline-block" />
                    <b>Trips</b>
                </NavbarBrand>
                <NavbarToggler onClick={toggle}/>
                <Collapse  isOpen={this.state.isOpen} navbar={true}>
                    <Nav justified={false} fill={true} >
                        {/* <NavItem>
                            <Button color='primary' onClick={alltrips} disabled={this.props.app.state.isLoading}>
                                <span className='fa fa-bars'/> 
                                All trips
                            </Button>
                        </NavItem> */}
                        <NavItem>
                            <Button color='primary' onClick={calendar} disabled={this.props.app.state.isLoading}>
                                <span className='fa fa-calendar'/> 
                                Calendar
                            </Button>
                        </NavItem>
                        <NavItem>
                            <Button color='primary' onClick={newtrip} disabled={this.props.app.state.isLoading} 
                                hidden={this.props.app.state.role < Role.TripLeader}>
                                <span className='fa fa-lightbulb-o'/> 
                                Suggest a trip
                            </Button>
                        </NavItem>
                        <NavItem>
                            <Button color='primary' onClick={newsletter} hidden={this.props.app.state.role < Role.Admin}>
                                <span className='fa fa-newspaper-o'/> 
                                Manage Newsletter
                            </Button>
                        </NavItem>
                        <NavItem>
                            <Button color='primary' onClick={newsocial} disabled={this.props.app.state.isLoading} 
                                hidden={this.props.app.state.role < Role.Admin}>
                                <span className='fa fa-users'/> 
                                Add a social event
                            </Button>
                        </NavItem>
                        {this.props.children}
                        <Dropdown nav={true} isOpen={this.state.priviledgesDropdownIsOpen} toggle={togglePriviledgesDropdown}
                                hidden={this.props.app.state.role < Role.Webmaster}>
                            <DropdownToggle className="triphub-navbar-dropdown" nav={true} caret={true}>
                                <span className='fa fa-ban fa-fw'/> 
                                Set Privileges
                            </DropdownToggle>
                            <DropdownMenu color='primary'>
                                <DropdownItem onClick={setAdminPrivileges}>Admin</DropdownItem>
                                <DropdownItem onClick={setTripLeaderPrivileges}>TripLeader</DropdownItem>
                                <DropdownItem onClick={setMemberPrivileges}>Member</DropdownItem>
                                <DropdownItem onClick={setNonMemberPrivileges}>NonMember</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </Nav>
                </Collapse>
            </Navbar>
        )
    }
}
