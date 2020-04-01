import * as React from 'react';
import { Component } from 'react';
import { InputControl, TextAreaInputControl } from './Control';
import { App } from './App';
import { Trip } from './Trip';
import { IValidation } from './Interfaces';
import { GetFullDate } from './Utilities';
import { Col, FormGroup, Label, Button, Form, Row  } from 'reactstrap';
import { Spinner } from '.';

export class Email extends Component<{
    owner: Trip
    app : App
    isLoading: boolean    
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
        this.send = this.send.bind(this)
    }

    public get(id: string) : any {
        return this.state[id]
    }
    public set(id: string, val: any) : void {
        this.setState({[id]: val})
    }

    public send() {
        this.setState({sending: true})
        this.app.apiCall('POST', this.props.owner.props.href + '/email', this.state, true)
            .then(() => this.setState({sending: false}))
    }

    public render(){
        const validations: IValidation[] = this.props.app.mandatory({subject:this.get('subject'),body:this.get('body')},['subject','body']);

        const onGet = (id: string): any => {
            return this.get(id);
        }
        const onSave = (id: string, value: any): Promise<void> => {
            this.set(id, value);
            return Promise.resolve();
        }
        const onGetValidationMessage = (id: string): any => {
            const found: IValidation | undefined = validations.find(v => v.id === id && !v.ok);
            return found ? found.message : null;
        }

        const common = {
            isLoading: this.props.isLoading,
            'onGet': onGet,
            'onSave': onSave,
            'onGetValidationMessage': onGetValidationMessage
        }

        return [
            <Form key='detail'>
                <Row noGutters={true}>
                    <Col>
                        <TextAreaInputControl key='recipients' id='recipients' label='Recipients' readOnly={true} {...common}/>,
                    </Col>
                </Row>
                <Row noGutters={true}>
                    <Col>
                        <InputControl key='subject' id='subject' label='Subject' type='text' {...common} />,
                    </Col>
                </Row>
                <Row noGutters={true}>
                    <Col>
                        <TextAreaInputControl key='body' id='body' label='Body' {...common} />,
                    </Col>
                </Row>
                <Row noGutters={true}>
                    <Col>
                        <FormGroup key='button'>
                            <Label/>
                            <Col sm={10}>
                                <Button onClick={this.send}>
                                    <span className='fa fa-paper-plane'/>
                                    {this.state.sending ? ['Sending ',Spinner] : 'Send'}
                                </Button>
                            </Col>
                        </FormGroup>
                    </Col>
                </Row>
            </Form>
        ]
    }
}
