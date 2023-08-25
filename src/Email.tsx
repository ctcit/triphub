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
        const filteredRecipients = this.props.participants.filter(p => !p.isDeleted && p.email.trim().length > 0)
        this.state = {
            recipients: filteredRecipients.map(p => p.name + ' <' + p.email.trim() + '>').join('; '),
            subject: `Re: ${this.props.trip.title} on ${GetFullDate(this.props.trip.tripDate)}`,
            body: '',
        }
        BindMethods(this)
    }

    public onSend() {
        const filteredRecipients = this.props.participants.filter(p => !p.isDeleted && p.email.trim().length > 0)
        this.setState({ sending: true })
        this.props.setTripIsEdited()
        TripsService.postTripEmail(this.props.trip.id, {
            recipients: filteredRecipients.map(p => p.email.trim()).join(';'),
            subject: this.state.subject,
            body: this.state.body
        })
            .then(() => this.setState({ sending: false }))
    }

    public async copy(field: 'names' | 'recipients') {
        this.setState({ copying: field });
        await new Promise(res => setTimeout(res, 1000))

        const text = field === "names" ? 
            this.props.participants.filter(p => !p.isDeleted).map(p => p.name).join(', ') :
            this.props.participants.filter(p => !p.isDeleted && p.email.trim().length > 0).map(p => p.email.trim()).join('; ')
        navigator.clipboard.writeText(text)

        this.setState({ copied: field, copying: undefined });
        await new Promise(res => setTimeout(res, 5000))
        this.setState({ copied: undefined });
    }

 
    public render() {
        const { sending, copying, copied } = this.state;

        const validations: IValidation[] = Mandatory(this.state, ['subject', 'body']);
        const participantsWithNoEmail = this.props.participants
            .filter(p => !p.isDeleted && p.email.trim().length === 0)
            .map(p => p.name)
            .join("; ")
        validations.push({ 
            field: 'recipients', 
            ok: participantsWithNoEmail.length === 0, 
            message: `The following participants have no email address: ` + participantsWithNoEmail 
        })

        const onGet = (field: string): any => (this.state as any)[field]
        const onSet = (field: string, value: any): void => this.setState({ [field]: value })
        const onSave = (field: string, value: any): Promise<any> => new Promise<any>((resolve) => {
            this.setState({ [field]: value }, () => resolve(value));
        })
        const onCopyNames = () => this.copy('names')
        const onCopyRecipients = () => this.copy('recipients')
        const onGetValidationMessage = (id: string): any => {
            const found: IValidation | undefined = validations.find(v => v.field === id && !v.ok);
            return found ? found.message : null;
        }
        const onSend = () => this.onSend();

        const common = {
            id: 'email',
            forceValidation: true,
            onGet, onSet, onSave, onGetValidationMessage
        }

        return [
            <Container key='detail' fluid={true}>
                <Row>
                    <Col>
                        <InputControl type={'textarea'} key={copying ?? 'recipients'} field={copying ?? 'recipients'}
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
