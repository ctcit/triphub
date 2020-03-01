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

        // return this.state.isPrivileged && !this.state.isLoading ? [
        return [
            {id:'volume', ok: this.state.newsletter.volume > 0, message: 'Volume number mest be greater than zero'},
        ];
    }

    public componentDidMount() {
        this.props.app.setStatus(['Loading ', Spinner])
        this.props.app.apiCall('GET', BaseUrl + "/newsletters/current")
        .then((newsletters:INewsletter[]) => {
            if (newsletters.length === 0)
            {
               this.startNewNewsletter(); 
            }
            else{
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

    private saveNewNesletter(){
        const newsletter = this.state.newsletter

        this.props.app.apiCall('POST',BaseUrl + '/newsletters',newsletter)
            .then( (newsletters: INewsletter[]) => {
                this.loadNewsletter(newsletters);
            })
    }

}
