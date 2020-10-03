import * as React from 'react';
import { Component } from 'react';
import { Form, Button, Container, Row, Col } from 'reactstrap';
import { InputControl } from '../Control';
import { BaseUrl, NewsletterGenerateUrl } from '..';
import { App } from '../App';
import { INewsletter, IValidation } from '../Interfaces';
import '../index.css';
import '../print.css';
import { GetDateString, IsValidDateString, GetClosestWednesday } from '../Utilities';
import { TripReportList } from './TripReportList';
import { NoticeList } from './NoticeList';
import { FullWidthLoading, Spinner } from '../Widgets';
import { Accordian } from '../Accordian';
import { NewsletterEventsList } from './NewsletterEvents';


export class Newsletter extends Component<{
    app: App,
    }, {
        newsletter: INewsletter,
        isSaving: boolean,
        isNew: boolean,
        isLoading: boolean,
    }> {

    public newNesletter: INewsletter

    public app : App;

    constructor(props:any){
        super(props)
        this.state = {
            newsletter: {id:0} as INewsletter,
            isSaving: false,
            isNew: false,
            isLoading: true
        }
        this.app = this.props.app
        this.saveNewNesletter = this.saveNewNesletter.bind(this)
    }


    public get(id: string) : any{
        return this.state.newsletter[id]
    }

    public set(id: string, val: any) : void {
        this.state.newsletter[id] = val;
    }

    public validate() : IValidation[] {
        return [
            {id:'volume', ok: this.state.newsletter.volume > 0, message: 'Volume must be greater than zero'},
            {id:'number', ok: this.state.newsletter.number > 0, message: 'Number mest be greater than zero'},
            {id:'date', ok: IsValidDateString(this.state.newsletter.date), message: 'Newsletter date is not valid'},
            {id:'issueDate', ok: IsValidDateString(this.state.newsletter.issueDate), message: 'Issue date is not valid'},
            {id:'nextdeadline', ok: IsValidDateString(this.state.newsletter.nextdeadline), message: 'Next deadline is not a valid date'},
        ];
    }

    public componentDidMount() {
        this.props.app.setStatus(['Loading ', Spinner])
        this.props.app.apiCall('GET', BaseUrl + "/newsletters/current")
        .then((newsletters:INewsletter[]) => {
            if (newsletters === null || newsletters.length === 0) {
               this.startNewNewsletter(); 
            }
            else {
                this.loadNewsletter(newsletters[0]);
                this.props.app.setStatus('Loaded', 3000)
            }
        })
            
    }


    public render(){
        const validations : IValidation[] = this.validate();

        const onGet = (id: string): any => {
            return this.get(id);
        }
        const onSave = (id: string, value: any): Promise<void> => {
            this.set(id, value);
            const body = {};
            body[id] = value;
            return this.saveNewsletter(body);
        }
        const onGetValidationMessage = (id: string): any => {
            const found: IValidation | undefined = validations.find(validation => validation.id === id && !validation.ok);
            return found ? found.message : null;
        }

        const common = {
            readOnly: false,
            isLoading: this.state.isLoading,
            owner: this,
            'onGet': onGet,
            'onSave': onSave,
            'onGetValidationMessage': onGetValidationMessage
        }

        const {newsletter, isLoading, isNew} = this.state
        const app = this.app

        return [
            <Container className={this.props.app.containerClassName()} key='newsletter' fluid={true}>
                <h1 key="title">Manage Newsletter</h1>
                {isNew && <div><p>No current newsletter, please create a new one..</p></div>}
                {isLoading && <FullWidthLoading />}
                {!isLoading &&
                    <Container key='form' fluid={true} className='my-3'>
                        <Row>
                            <Col sm={5} md={4}>
                                <InputControl id='volume' label='Volume' type='number' {...common}/>
                            </Col>
                            <Col sm={5} md={4}>
                                <InputControl id='number' label='Number' type='number' {...common}/>
                            </Col>
                        </Row>
                        <Row>
                            <Col sm={5} md={4}>
                                <InputControl id='date' label='Date' type='date' {...common}/>
                            </Col>
                            <Col sm={5} md={4}>
                                <InputControl id='issueDate' label='Issue Date' type='date' {...common}/>
                            </Col>
                            <Col sm={5} md={4}>
                                <InputControl id='nextdeadline' label='Next Deadline' type='date' {...common}/>
                            </Col>
                        </Row>
                        {!isNew &&
                            <Button key="generate" color='primary' onClick={this.generate} visible={!isLoading}>
                                <span className='fas fa-download'/> Generate
                            </Button>}
                        {isNew &&
                            <Button key="saveNew" color='primary' onClick={this.saveNewNesletter} visible={!isLoading}>
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
                            <NewsletterEventsList app={this.app}/>
                            <div className="m-2">
                                <p>The following trips will <b>not</b> be published - this could be because they are not
                                open by the newsletter date or are not approved.</p>
                            </div>
                            <NewsletterEventsList app={this.app} unpublished={true}/>
                        </Accordian>

                        <Accordian id='tripReports' className='trip-group my-5' headerClassName='newsletter-group-header' expanded={true}
                            title='Trip Reports'>
                            <div className="m-2">
                                <TripReportList app={app} newsletterId={newsletter.id}/>
                            </div>
                        </Accordian>

                        <Accordian id='tripReports' className='trip-group my-5' headerClassName='newsletter-group-header' expanded={true}
                            title='Notices'>
                            <div className="m-2">
                                <NoticeList app={app}/>
                            </div>
                        </Accordian>
                    </div>
                }
            </Container>
        ]
    }

    private loadNewsletter(loaded_newsletter: INewsletter) {
        this.setState({
            newsletter: loaded_newsletter,
            isNew: false,
            isLoading: false
        });
        this.props.app.setState({ isLoading: false });
        // Load trip reports & trips
    }

    private startNewNewsletter() {
        this.setState({isNew: true})
        // Get the latest newsletter to figure out the next volume/issue number
        this.props.app.apiCall('GET', BaseUrl + "/newsletters/latest")
        .then((newsletters:INewsletter[]) => {
            const now : Date = new Date()
            const newsletterDate : Date = new Date(now.getFullYear(), now.getMonth()+1);
            // Date.month is indexed from 0
            const may:number = 5;
            const lastAnniversaryDate : Date = (now.getMonth() >= may) ? new Date(now.getFullYear(), may) : new Date(now.getFullYear()-1, may);

            const nextNewsletterDate:Date = new Date(newsletterDate)
            nextNewsletterDate.setMonth(newsletterDate.getMonth()+1)
            const nextNewsletterClubNight:Date = GetClosestWednesday(nextNewsletterDate);
            // The next deadline should be the thursday before the clubnight of the next newsletter
            // which is always 6 days before the club night
            const nextDeadline:Date = new Date(nextNewsletterClubNight)
            // According to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/setDate
            // passing a negative number to setDate decrements the month accordingly (which we want)
            nextDeadline.setDate(nextNewsletterClubNight.getDate() - 6)

            // Club nights are on Wednesdays
            const closestClubNight:Date = new Date(newsletterDate)
            closestClubNight.setDate(newsletterDate.getDate() + (3 - (newsletterDate.getDay()%7)))

            // Determine volume & number
            let nextVolume : number = 0;
            let nextNumber : number = 0;
            if (newsletters !== null && newsletters.length !== 0)
            {
                const lastNewsletter: INewsletter = newsletters[0];
                const lastNewsletterDate: Date = new Date(lastNewsletter.date)
                if ( lastNewsletterDate < lastAnniversaryDate )
                {
                    nextVolume = lastNewsletter.volume + 1
                    nextNumber = 1
                }
                else
                {
                    nextVolume = lastNewsletter.volume
                    nextNumber = lastNewsletter.number + 1
                }
            }
            else {
                // PENDING - Flag to the user that these are probably wrong!
                nextVolume = 1
                nextNumber = 1
            }

            this.newNesletter = {
                id: -1,
                volume: nextVolume,
                number: nextNumber,
                date: GetDateString(newsletterDate),
                issueDate: GetDateString(closestClubNight),
                nextdeadline: GetDateString(nextDeadline),
                // PENDING - make API force isCurrent=false
                isCurrent: false,
            }
            this.setState({newsletter: this.newNesletter, isLoading: false})
            this.props.app.setStatus('Loaded', 3000)
        })
    }

    private saveNewsletter(body: any): Promise<any> {
        return this.app.apiCall('POST', BaseUrl + '/newsletters/' + this.state.newsletter.id, body, false);
    }

    private saveNewNesletter(){
        const newsletter = this.state.newsletter

        this.setState({isLoading: true})

        this.app.apiCall('POST', BaseUrl + '/newsletters/', newsletter, false)
        .then( (newsletters: INewsletter[]) => {
            if (newsletters !== null && newsletters.length > 0)
            {
                const savedNewsletter:INewsletter = newsletters[0]
                console.log("Saved newsletter, id="+savedNewsletter.id)
                this.props.app.apiCall('POST', BaseUrl + '/newsletters/'+savedNewsletter.id+'/current/')
                .then( () => {
                    console.log("Succesfully set as current")
                    this.setState({isNew: false})
                    this.loadNewsletter(newsletters[0]);
                })
            }
            else {
                // PENDING - Flag failure somehow
                console.log("Failed to save")
            }
        })
    }

    private generate() {
        window.location.href = NewsletterGenerateUrl
    }

}
