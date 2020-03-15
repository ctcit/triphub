import * as React from 'react';
import { Component } from 'react';
import { Form, Button } from 'reactstrap';
import { SaveableControl } from './SaveableControl';
import { Spinner, BaseUrl } from '.';
import { App } from './App';
import { INewsletter, IValidation } from './Interfaces';
import './index.css';
import './print.css';
import { TriphubNavbar } from './TriphubNavBar';
import { GetDateString, IsValidDateString } from './Utilities';


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
        this.get = this.get.bind(this)
        this.set = this.set.bind(this)
        this.validate = this.validate.bind(this)
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
            if (newsletters.length === 0) {
               this.startNewNewsletter(); 
            }
            else {
                this.loadNewsletter(newsletters);
                // this.props.app.setStatus('Loaded Trip', 3000)
            }
        })
            
    }

    public render(){
        const readOnly = {readOnly: false};
        return [
            <TriphubNavbar key='triphubnavbar' app={this.props.app}/>,
            <h1 key="title">Manage Newsletter</h1>,

            <Form key='form'>
                <SaveableControl owner={this} id='volume' label='Volume' type='number' {...readOnly}/>
                <SaveableControl owner={this} id='number' label='Number' type='number' {...readOnly}/>
                <SaveableControl owner={this} id='date' label='Date' type='date' {...readOnly}/>
                <SaveableControl owner={this} id='issueDate' label='Issue Date' type='date' {...readOnly}/>
                <SaveableControl owner={this} id='nextdeadline' label='Next Deadline' type='date' {...readOnly}/>
            </Form>,

            <Button key="saveNew" color='primary' onClick={this.saveNewNesletter} visible={this.state.isNew && !this.state.isLoading}>
                Save
            </Button>
        ]
    }

    private loadNewsletter(newsletters: INewsletter[]) {
        this.setState({
            newsletter: newsletters[0],
            isNew: false,
            isLoading: false
        });
        this.props.app.setState({ isLoading: false });
    }

    private startNewNewsletter() {
        // Get the latest newsletter to figure out the next volume/issue number
        this.props.app.apiCall('GET', BaseUrl + "/newsletters/latest")
        .then((newsletters:INewsletter[]) => {
            let now : Date = new Date()
            let newsletterDate : Date = new Date(now.getFullYear(), now.getMonth());
            const lastAnniversaryDate : Date = (now.getMonth() >= 5) ? new Date(now.getFullYear(), 5) : new Date(now.getFullYear()-1, 5);
            let nextVolume : number = 0;
            let nextNumber : number = 0;
            if (newsletters.length === 0)
            {
                const lastNewsletter: INewsletter = newsletters[0];
                const lastNewsletterDate: Date = new Date(lastNewsletter.date)
                if ( lastNewsletterDate < lastAnniversaryDate )
                {
                    nextVolume = lastNewsletter.volume + 1
                    nextNumber = 0
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

            // Club nights are on Wednesdays
            let closestClubNight:Date = new Date(newsletterDate)
            closestClubNight.setDate(newsletterDate.getDate() + (3 - (newsletterDate.getDay()%7)))

            // next deadline should be the thursday before the closestClubNight

            this.newNesletter = {
                id: -1,
                volume: nextVolume,
                number: nextNumber,
                date: GetDateString(newsletterDate),
                // PENDING
                issueDate: GetDateString(closestClubNight),
                nextdeadline: "01-01-2001",
                // PENDING - make API force isCurrent=false
                isCurrent: false,
            }
            this.setState({newsletter: this.newNesletter})
            // PENDING - loading state
        })
    }

    private saveNewNesletter(){
        const newsletter = this.state.newsletter

        this.props.app.apiCall('POST',BaseUrl + '/newsletters',newsletter)
            .then( (newsletters: INewsletter[]) => {
                // PENDING - set as current
                this.loadNewsletter(newsletters);
            })
    }

}
