import { Component } from 'react';
import * as React from 'react';
import { App } from './App';
import Navbar from 'reactstrap/lib/Navbar';
import Button from 'reactstrap/lib/Button';
import Fade from 'reactstrap/lib/Fade';
import Badge from 'reactstrap/lib/Badge';
import { Role } from './Interfaces';

export class TriphubNavbar extends Component<{
    app: App
    },{}> {
    constructor(props: any){
        super(props)
    }

    public render(){

        const alltrips = () => this.props.app.setPath('/')
        const calendar = () => this.props.app.setPath('/calendar')
        const newtrip = () => this.props.app.setPath('/newtrip')
        const newsletter = () => this.props.app.setPath('/newsletter')
        const newsocial = () => this.props.app.setPath('/newsocial')
        const revokePrivileges = () => this.props.app.setState({role:Role.Member})
        const me = this.props.app.getMe()

        return (
            <Navbar color='white' light={true} expand='md'>
                <Button color='primary' onClick={alltrips} disabled={this.props.app.state.isLoading}>
                    <span className='fa fa-bars'/> 
                    All trips
                </Button>
                <Button color='primary' onClick={calendar} disabled={this.props.app.state.isLoading}>
                    <span className='fa fa-calendar'/> 
                    Calendar
                </Button>
                <Button color='primary' onClick={newtrip} disabled={this.props.app.state.isLoading} hidden={this.props.app.state.role < Role.TripLeader} >
                    <span className='fa fa-lightbulb-o'/> 
                    Suggest a trip
                </Button>
                <Button color='primary' onClick={newsletter} hidden={this.props.app.state.role < Role.Admin} >
                    <span className='fa fa-newspaper-o'/> 
                    Manage Newsletter
                </Button>
                <Button color='primary' onClick={newsocial} disabled={this.props.app.state.isLoading} 
                    hidden={this.props.app.state.role < Role.Admin}>
                    <span className='fa fa-users'/> 
                    Add a social event
                </Button>
                <Button color='primary' onClick={revokePrivileges} hidden={this.props.app.state.role < Role.Webmaster} >
                    <span className='fa fa-ban'/> 
                    Revoke Privileges
                </Button>
                {this.props.children}
                <span>
                    <Fade in={this.props.app.state.statusShow}>
                        <Badge color='success'>{this.props.app.state.status}</Badge>
                    </Fade>
                </span>
            </Navbar>
        )
    }
}
