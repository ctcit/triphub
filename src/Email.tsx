import * as React from 'react';
import { Component } from 'react';
import { InputControl, TextAreaInputControl } from './Control';
import { App } from './App';
import { Trip } from './Trip';
import { IValidation } from './Interfaces';
import { BindMethods, GetFullDate } from './Utilities';
import { Col, FormGroup, Label, Button, Form, Row, Container } from 'reactstrap';
import { Spinner } from './Widgets';

export class Email extends Component<{
    owner: Trip
    app: App
}, {
    recipients?: string
    subject?: string
    body?: string
    sending?: boolean
}>{
    public app: App

    constructor(props: any) {
        super(props)

        this.state = {
            recipients: this.props.owner.state.participants.filter(p => !p.isDeleted).map(p => p.email).join('; '),
            subject: `Re: ${this.props.owner.state.trip.title} on ${GetFullDate(this.props.owner.state.trip.tripDate)}`,
            body: '',
        }
        this.app = this.props.app
        BindMethods(this)
    }

    public onSend() {
        this.setState({ sending: true })
        this.app.triphubApiCall('POST', this.props.owner.props.href + '/email', this.state, true)
            .then(() => this.setState({ sending: false }))
    }

    public render() {
        const validations: IValidation[] = this.props.app.mandatory(this.state, ['subject', 'body']);
        const onGet = (field: string): any => this.state[field]
        const onSet = (field: string, value: any): void => this.setState({ [field]: value })
        const onSave = (_: string, __: any): Promise<void> => Promise.resolve()
        const onGetValidationMessage = (id: string): any => {
            const found: IValidation | undefined = validations.find(v => v.field === id && !v.ok);
            return found ? found.message : null;
        }
        const onSend = () => this.onSend();

        const common = {
            id: 'email',
            onGet, onSet, onSave, onGetValidationMessage
        }

        return [
            <Container key='detail' fluid={true}>
                <Row>
                    <Col>
                        <TextAreaInputControl key='recipients' field='recipients' label='Recipients' readOnly={true} {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <InputControl key='subject' field='subject' label='Subject' type='text' {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <TextAreaInputControl key='body' field='body' label='Body' {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <FormGroup key='button'>
                            <Label />
                            <Col sm={10}>
                                <Button onClick={onSend}>
                                    <span className='fa fa-paper-plane' />
                                    {this.state.sending ? ['Sending ', Spinner] : 'Send'}
                                </Button>
                            </Col>
                        </FormGroup>
                    </Col>
                </Row>
            </Container>
        ]
    }
}
