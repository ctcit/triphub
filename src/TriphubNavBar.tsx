import { Component } from 'react';
import * as React from 'react';
import { App, AppState } from './App';
import Navbar from 'reactstrap/lib/Navbar';
import Button from 'reactstrap/lib/Button';
import Fade from 'reactstrap/lib/Fade';
import Badge from 'reactstrap/lib/Badge';

export class TriphubNavbar extends Component<{
    app: App,
    },{}> {
    constructor(props: any){
        super(props)
    }
    public render(){
        return (
            <Navbar color='light' light={true} expand='md'>
                <Button color='primary' onClick={this.props.app.setModeList} disabled={this.props.app.state.loading}>
                    <span className='fa fa-bars'/> 
                    All trips
                </Button>
                <Button color='primary' onClick={this.props.app.setModeCalendar} disabled={this.props.app.state.loading}>
                    <span className='fa fa-calendar'/> 
                    Calendar
                </Button>
                <Button color='primary' onClick={this.props.app.setModeNew} disabled={this.props.app.state.loading} hidden={this.props.app.state.appState === AppState.New}>
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
