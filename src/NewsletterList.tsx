import * as React from 'react';
import { Component } from 'react';
import { Spinner } from '.';
import { App } from './App';
import { BaseUrl } from '.';
import { INewsletter } from './Interfaces';
import './index.css';
import './print.css';
import { TriphubNavbar } from './TriphubNavBar';
import { NewsletterGroup } from './NewsletterGroup';


export class NewsletterList extends Component<{
    app: App
  },{
    newsletters: INewsletter[],
    current: INewsletter,
  }> {
    constructor(props: any){
        super(props)
        this.state = {
            newsletters: [],
            current: {id:0} as INewsletter
        }
        this.requery = this.requery.bind(this)
    }

    public requery() {
        this.props.app.setStatus(['Loading ', Spinner]);
        // PENDING - some way of doing pagination, or by year or something
        this.props.app.apiCall('GET',BaseUrl + '/newsletters')
        .then((data:INewsletter[]) => {
        this.setState({newsletters: data})
        this.props.app.setStatus('Loaded', 3000)
        this.props.app.setState({isLoading:false});
        });
    }

    public componentDidMount(){
        this.props.app.apiCall('GET', BaseUrl+'/newsletters/current')
        .then((data:INewsletter) => {
            this.setState({current:data});
        });
        this.requery()
    }

    public render(){
        
        let currentNewsletter : any;
        if (this.state.current.id === 0)
        {
            currentNewsletter = <span>No current newsletter!<button>Create</button></span>

        }
        else
        {
            currentNewsletter = <NewsletterGroup key="pastNewsletters" app={this.props.app} newsletters={[this.state.current]}/>

        }
        return [
                <TriphubNavbar key='triphubNavbar' app={this.props.app}/>,
                // Current newsletter summary of link to create
                <h2 key='currentNewsletterTitle'>Current Newsletter</h2>,
                currentNewsletter,
                // Summaries of other newsletters
                <h2 key='pastNewslettersTitle'>Past newsletters</h2>,
                <NewsletterGroup key="pastNewsletters" app={this.props.app} newsletters={this.state.newsletters}/>
            ]
        }
}
