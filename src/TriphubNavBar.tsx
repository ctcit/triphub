import { Component } from 'react';
import * as React from 'react';
import { App } from './App';
import Navbar from 'reactstrap/lib/Navbar';
import Button from 'reactstrap/lib/Button';
import Fade from 'reactstrap/lib/Fade';
import Badge from 'reactstrap/lib/Badge';

export class TriphubNavbar extends Component<{
    app: App
    router: any
    },{}> {
    constructor(props: any){
        super(props)
    }

    public render(){

        const alltrips = () => this.props.router.history.push('/')
        const calendar = () => this.props.router.history.push('/calendar')
        const newtrip = () => this.props.router.history.push('/newtrip')

        return (
            <Navbar color='light' light={true} expand='md'>
                <Button color='primary' onClick={alltrips} disabled={this.props.app.state.loading}>
                    <span className='fa fa-bars'/> 
                    All trips
                </Button>
                <Button color='primary' onClick={calendar} disabled={this.props.app.state.loading}>
                    <span className='fa fa-calendar'/> 
                    Calendar
                </Button>
                <Button color='primary' onClick={newtrip} disabled={this.props.app.state.loading} 
                    hidden={this.props.router.location && this.props.router.location.pathname !== '/'}>
                    <span className='fa fa-lightbulb-o'/> 
                    Suggest a trip
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
