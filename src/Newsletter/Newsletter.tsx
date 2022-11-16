import { Component } from 'react';
import { Button, Container, Row, Col } from 'reactstrap';
import { InputControl } from '../Control';
import { NewsletterGenerateUrl } from '..';
import { App } from '../App';
import { INewsletter, IValidation } from '../Interfaces';
import '../index.css';
import { GetDateString, IsValidDateString, GetClosestWednesday, BindMethods } from '../Utilities';
import { TripReportList } from './TripReportList';
import { NoticeList } from './NoticeList';
import { Accordian } from '../Accordian';
import { NewsletterEventsList } from './NewsletterEvents';
import { ConfigService } from 'src/Services/ConfigService';
import { NewslettersService } from 'src/Services/NewlettersService';


export class Newsletter extends Component<{
    app: App
}, {
    newsletter: INewsletter
    isLoadingNewsletter: boolean,
    isSaving: boolean
    isNew: boolean
}> {

    public newNewsletter: INewsletter = { id: 0 } as INewsletter
    public app: App

    constructor(props: any) {
        super(props)
        this.state = {
            newsletter: { id: 0 } as INewsletter,
            isLoadingNewsletter: true,
            isSaving: false,
            isNew: false
        }
        this.app = this.props.app
        BindMethods(this)
    }


    public get(id: string): any {
        return this.state.newsletter[id]
    }

    public set(id: string, val: any): void {
        this.state.newsletter[id] = val;
    }

    public validate(): IValidation[] {
        return [
            { field: 'volume', ok: this.state.newsletter.volume > 0, message: 'Volume must be greater than zero' },
            { field: 'number', ok: this.state.newsletter.number > 0, message: 'Number must be greater than zero' },
            { field: 'date', ok: IsValidDateString(this.state.newsletter.date), message: 'Newsletter date is not valid' },
            { field: 'issueDate', ok: IsValidDateString(this.state.newsletter.issueDate), message: 'Issue date is not valid' },
            { field: 'nextdeadline', ok: IsValidDateString(this.state.newsletter.nextdeadline), message: 'Next deadline is not a valid date' },
        ];
    }

    public componentDidMount() {
        NewslettersService.getNewslettersCurrent()
            .then((newsletters: INewsletter[]) => {
                if (newsletters === null || newsletters.length === 0) {
                    this.startNewNewsletter();
                }
                else {
                    if (!newsletters[0].isCurrent) {
                        NewslettersService.postNewsletterSetCurrent(newsletters[0].id)
                        // don't need to wait for the result here...
                    }
                    this.loadNewsletter(newsletters[0]);
                }
            })

    }


    public render() {
        if (this.state.isLoadingNewsletter) {
            return this.props.app.loadingStatus({ ...this.props.app.state, ...this.state })
        }

        const validations: IValidation[] = this.validate();

        const onGet = (field: string): any => this.get(field)
        const onSet = (field: string, value: any): void => this.set(field, value)
        const onSave = (field: string, value: any): Promise<void> => this.saveNewsletter({ [field]: value })
        const onGetValidationMessage = (field: string): any => {
            const found: IValidation | undefined =
                validations.find(validation => validation.field === field && !validation.ok);
            return found ? found.message : null
        }

        const common = {
            id: 'newsletter',
            readOnly: false,
            owner: this,
            onGet, onSet, onSave, onGetValidationMessage
        }

        const { newsletter, isNew } = this.state
        const app = this.app

        const generate = () => this.generate();
        const onSaveNewNewsletter = () => this.onSaveNewNewsletter();

        return [
            <Container className={ConfigService.containerClassName} key='newsletter' fluid={true}>
                <Container fluid={true} >
                    <h1 key="title">Manage Newsletter</h1>
                    {isNew && <div><p>No current newsletter, please create a new one..</p></div>}
                </Container>
                {<Container key='form' fluid={true} className='my-3'>
                    <Row>
                        <Col sm={5} md={4}>
                            <InputControl field='volume' label='Volume' type='number' {...common} />
                        </Col>
                        <Col sm={5} md={4}>
                            <InputControl field='number' label='Number' type='number' {...common} />
                        </Col>
                    </Row>
                    <Row>
                        <Col sm={5} md={4}>
                            <InputControl field='date' label='Date' type='date' {...common} />
                        </Col>
                        <Col sm={5} md={4}>
                            <InputControl field='issueDate' label='Issue Date' type='date' {...common} />
                        </Col>
                        <Col sm={5} md={4}>
                            <InputControl field='nextdeadline' label='Next Deadline' type='date' {...common} />
                        </Col>
                    </Row>
                    {!isNew &&
                        <Button key="generate" color='primary' onClick={generate}>
                            <span className='fas fa-download' /> Generate
                            </Button>}
                    {isNew &&
                        <Button key="saveNew" color='primary' onClick={onSaveNewNewsletter}>
                            Save
                            </Button>
                    }
                </Container>
                }
                {!isNew &&
                    <div key="details">
                        <Accordian id='tripsSocials' className='trip-group my-5' headerClassName='newsletter-group-header' expanded={true}
                            title='Trips and Socials'>
                            <div className="m-2">
                                <p>The following trips will be listed in the newsletter:</p>
                            </div>
                            <NewsletterEventsList app={this.app} />
                            <div className="m-2">
                                <p>The following trips will <b>not</b> be published - this could be because they are not
                                open by the newsletter date or are not approved.</p>
                            </div>
                            <NewsletterEventsList app={this.app} unpublished={true} />
                        </Accordian>

                        <Accordian id='tripReports' className='trip-group my-5' headerClassName='newsletter-group-header' expanded={true}
                            title='Trip Reports'>
                            <div className="m-2">
                                <TripReportList app={app} newsletterId={newsletter.id} key={'tripReports' + newsletter.id} />
                            </div>
                        </Accordian>

                        <Accordian id='tripReports' className='trip-group my-5' headerClassName='newsletter-group-header' expanded={true}
                            title='Notices'>
                            <div className="m-2">
                                <NoticeList app={app} />
                            </div>
                        </Accordian>
                    </div>
                }
            </Container>
        ]
    }

    private loadNewsletter(newsletter: INewsletter) {
        this.setState({ newsletter, isNew: false, isLoadingNewsletter: false });
        // Load trip reports & trips
    }

    private startNewNewsletter() {
        this.setState({ isNew: true })
        // Get the latest newsletter to figure out the next volume/issue number
        NewslettersService.getNewslettersLatest()
            .then((newsletters: INewsletter[]) => {
                const now: Date = new Date()
                const newsletterDate: Date = new Date(now.getFullYear(), now.getMonth() + 1);
                // Date.month is indexed from 0
                const may: number = 5;
                const lastAnniversaryDate: Date = (now.getMonth() >= may) ? new Date(now.getFullYear(), may) : new Date(now.getFullYear() - 1, may);

                const nextNewsletterDate: Date = new Date(newsletterDate)
                nextNewsletterDate.setMonth(newsletterDate.getMonth() + 1)
                const nextNewsletterClubNight: Date = GetClosestWednesday(nextNewsletterDate);
                // The next deadline should be the thursday before the clubnight of the next newsletter
                // which is always 6 days before the club night
                const nextDeadline: Date = new Date(nextNewsletterClubNight)
                // According to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setDate
                // passing a negative number to setDate decrements the month accordingly (which we want)
                nextDeadline.setDate(nextNewsletterClubNight.getDate() - 6)

                // Club nights are on Wednesdays
                const closestClubNight: Date = new Date(newsletterDate)
                closestClubNight.setDate(newsletterDate.getDate() + (3 - (newsletterDate.getDay() % 7)))

                // Determine volume & number
                let nextVolume: number = 0;
                let nextNumber: number = 0;
                if (newsletters !== null && newsletters.length !== 0) {
                    const lastNewsletter: INewsletter = newsletters[0];
                    const lastNewsletterDate: Date = new Date(lastNewsletter.date)
                    if (lastNewsletterDate < lastAnniversaryDate) {
                        nextVolume = lastNewsletter.volume + 1
                        nextNumber = 1
                    }
                    else {
                        nextVolume = lastNewsletter.volume
                        nextNumber = lastNewsletter.number + 1
                    }
                }
                else {
                    // PENDING - Flag to the user that these are probably wrong!
                    nextVolume = 1
                    nextNumber = 1
                }

                this.newNewsletter = {
                    id: -1,
                    volume: nextVolume,
                    number: nextNumber,
                    date: GetDateString(newsletterDate),
                    issueDate: GetDateString(closestClubNight),
                    nextdeadline: GetDateString(nextDeadline),
                    // PENDING - make API force isCurrent=false - or remove teh whole isCurrent mechanism
                    isCurrent: false,
                }
                this.setState({ newsletter: this.newNewsletter, isLoadingNewsletter: false })
            })
    }

    private saveNewsletter(body: any): Promise<any> {
        return NewslettersService.postNewsletter(this.state.newsletter.id, body);
    }

    private onSaveNewNewsletter() {
        const newsletter = this.state.newsletter

        this.setState({ isLoadingNewsletter: true })

        NewslettersService.postNewNewsletter(newsletter)
            .then((savedNewsletter: INewsletter) => {
                console.log("Saved newsletter, id=" + savedNewsletter.id)
                NewslettersService.postNewsletterSetCurrent(savedNewsletter.id)
                    .then(() => {
                        console.log("Succesfully set as current")
                        this.setState({ isNew: false })
                        this.loadNewsletter(savedNewsletter);
                    })
            })
    }

    private generate() {
        window.location.href = NewsletterGenerateUrl
    }

}
