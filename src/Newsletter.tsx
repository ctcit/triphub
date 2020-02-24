import * as React from 'react';
import { Component } from 'react';
import { Form } from 'reactstrap';
import { SaveableControl } from './SaveableControl';
import { Spinner, BaseUrl } from '.';
import { App } from './App';
import { INewsletter, IValidation } from './Interfaces';
import './index.css';
import './print.css';
import { TriphubNavbar } from './TriphubNavBar';


export class Newsletter extends Component<{
    app: App,
    href?: string,
    isNew : boolean
    }, {
        newsletter: INewsletter,
        isSaving: boolean
    }> {

    public newNesletter: INewsletter

    public href?: string
    public app : App;

    constructor(props:any){
        super(props)
        this.state = {
            newsletter: {id:0} as INewsletter,
            isSaving: true
        }
        this.app = this.props.app
        this.get = this.get.bind(this)
        this.set = this.set.bind(this)
        this.href = this.props.href
        this.validate = this.validate.bind(this)
    }

    public get(id: string) : any{
        return this.state.newsletter[id]
    }

    public set(id: string, val: any) : void {
        this.state.newsletter[id] = val;
    }

    public validate() : IValidation[] {

        // return this.state.isPrivileged && !this.state.isLoading ? [
        return [
            {id:'volume', ok: this.state.newsletter.volume > 0, message: 'Volume number mest be greater than zero'},
        ];
    }

    public componentDidMount() {
        if (this.props.isNew) {
            this.props.app.setState({isLoading: false})    
            this.startNewNewsletter()
        } else {
            this.props.app.setStatus(['Loading ', Spinner])

            this.props.app.apiCall('GET',this.props.href as string)
            .then((newsletter:INewsletter) => {
                this.setState({newsletter:newsletter[0]})
                this.props.app.setState({isLoading: false})
                this.props.app.setStatus('Loaded Trip', 3000)
            })
        }
            
    }

    public startNewNewsletter() {

        this.newNesletter = {
            id: 99,
            volume: 99,
            number: 99,
            date: "01/01/2001",
            issueDate: "01/01/2001",
            nextdeadline: "01/01/2001",
            isCurrent: true,
        }
        this.setState({newsletter: this.newNesletter})
    }

    public saveNewNesletter(){
        const newsletter = this.state.newsletter

        this.props.app.apiCall('POST',BaseUrl + '/newsletters',newsletter)
            .then(() => this.props.app.setPath('/newsletterlist'))
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
            </Form>
        ]
    }

}
