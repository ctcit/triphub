import * as React from 'react';
import { Component } from 'react';
import { Control } from './Control';
import { App } from './App';
import { Trip } from './Trip';
import { IValidation } from './Interfaces';
import { GetFullDate } from './Utilities';
import { Col, FormGroup, Label, Button  } from 'reactstrap';
import { Spinner } from '.';

export class Email extends Component<{
    owner: Trip
    app : App
},{
    recipients?: string
    subject? : string
    body? : string
    sending? : boolean
}>{
    public app : App

    constructor(props : any){
        super(props)

        this.state = {
            recipients: this.props.owner.state.participants.filter(p => p.isDeleted).map(p => p.email).join('; '),
            subject: `Re: ${this.props.owner.state.trip.title} on ${GetFullDate(this.props.owner.state.trip.tripDate)}`,
            body: '', 
        }
        this.app = this.props.app
        this.get = this.get.bind(this)
        this.set = this.set.bind(this)
        this.validate = this.validate.bind(this)
        this.send = this.send.bind(this)
    }

    public get(id: string) : any {
        return this.state[id]
    }
    public set(id: string, val: any) : void {
        this.setState({[id]: val})
    }

    public validate() : IValidation[] {
        return this.props.app.mandatory({subject:this.get('subject'),body:this.get('body')},['subject','body'])
    }

    public send() {
        this.setState({sending: true})
        this.app.apiCall('POST', this.props.owner.state.trip.href + '/email', this.state, true)
            .then(() => this.setState({sending: false}))
    }

    public render(){
        return [
            <Control key='recipients' id='recipients' type='textarea' owner={this} label='Recipients' readOnly={true}/>,
            <Control key='subject' id='subject' type='text' owner={this} label='Subject' />,
            <Control key='body' id='body' type='textarea' owner={this} label='Body' />,
            <FormGroup key='button'>
                <Label/>
                <Col sm={10}>
                    <Button onClick={this.send}>
                        <span className='fa fa-paper-plane'/>
                        {this.state.sending ? ['Sending ',Spinner] : 'Send'}
                    </Button>
                </Col>
            </FormGroup>
        ]
    }
}
