import * as React from 'react';
import { Component } from 'react';
import { InputControl, TextAreaInputControl } from './Control';
import { IParticipant, ITrip, IValidation } from './Interfaces';
import { BindMethods, GetFullDate, Mandatory } from './Utilities';
import { Col, FormGroup, Label, Button, Row, Container } from 'reactstrap';
import { Spinner } from './Widgets';
import { TripsService } from './Services/TripsService';

export class Email extends Component<{
    trip: ITrip
    participants: IParticipant[]
    setTripIsEdited: () => void
}, {
    recipients?: string
    names?: string
    subject?: string
    body?: string
    sending?: boolean
    copying?: undefined | 'names' | 'recipients'
    copied?: undefined | 'names' | 'recipients'
}>{
    constructor(props: any) {
        super(props)

        this.state = {
            recipients: this.props.participants.filter(p => !p.isDeleted).map(p => p.email).join('; '),
            names: this.props.participants.filter(p => !p.isDeleted).map(p => p.name).join(', '),
            subject: `Re: ${this.props.trip.title} on ${GetFullDate(this.props.trip.tripDate)}`,
            body: '',
        }
        BindMethods(this)
    }

    public onSend() {
        this.setState({ sending: true })
        this.props.setTripIsEdited()
        TripsService.postTripEmail(this.props.trip.id, this.state)
            .then(() => this.setState({ sending: false }))
    }

    public async copy(field: 'names' | 'recipients') {
        this.setState({ copying: field });
        await new Promise(res => setTimeout(res, 1000))
        const textarea = document.createElement('textarea')
        document.body.appendChild(textarea)
        textarea.value = `${this.state[field]}`
        textarea.select()
        textarea.setSelectionRange(0, textarea.value.length);
        (document as any).execCommand('copy')
        document.body.removeChild(textarea)
        this.setState({ copied: field, copying: undefined });
        await new Promise(res => setTimeout(res, 5000))
        this.setState({ copied: undefined });
    }

 
    public render() {
        const { sending, copying, copied } = this.state;
        const validations: IValidation[] = Mandatory(this.state, ['subject', 'body']);
        const onGet = (field: string): any => (this.state as any)[field]
        const onSet = (field: string, value: any): void => this.setState({ [field]: value })
        const onSave = (field: string, value: any): Promise<any> => { this.setState({ [field]: value }); return Promise.resolve() }
        const onCopyNames = () => this.copy('names')
        const onCopyRecipients = () => this.copy('recipients')
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
                        <TextAreaInputControl key={copying ?? 'recipients'} field={copying ?? 'recipients'}
                            label='Recipients' readOnly={true} {...common} />
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
                                    {sending ? Spinner : <span className='fa fa-paper-plane' />}
                                    {sending ? 'Sending' : 'Send'}
                                </Button>
                                &nbsp;
                                <Button onClick={onCopyNames}>
                                    {copying === 'names' ? Spinner : <span className='fa fa-copy' />}
                                    {copying === 'names' ? 'Copying ' : copied === 'names' ? 'Copied ' : 'Copy '}
                                    Names
                                </Button>
                                &nbsp;
                                <Button onClick={onCopyRecipients}>
                                    {copying === 'recipients' ? Spinner : <span className='fa fa-copy' />}
                                    {copying === 'recipients' ? 'Copying ' : copied === 'recipients' ? 'Copied ' : 'Copy '}
                                    Email Addresses
                                </Button>
                            </Col>
                        </FormGroup>
                    </Col>
                </Row>
            </Container>
        ]
    }
}
