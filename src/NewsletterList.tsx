
import * as React from 'react';
import { Component } from 'react';
import { Spinner } from '.';
import { App } from './App';
import { BaseUrl } from '.';
import { INewsletter } from './Interfaces';
import './index.css';
import './print.css';
import { NewsletterGroup } from './NewsletterGroup';

export class NewsletterList extends Component<{
    app: App
    volume: number
  },{
    newsletters: INewsletter[],
  }> {
    
    constructor(props: any){
        super(props)
        this.state = {
            newsletters: [],
        }
    }

    public componentDidMount(){
        this.requery();
    }

    public requery() {
        if (this.props.volume !== 0)
        {
            this.props.app.setStatus(['Loading ', Spinner]);
            this.props.app.apiCall('GET',BaseUrl + '/newsletters/volumes/'+this.props.volume)
            .then((data:INewsletter[]) => {
                this.setState({newsletters: data})
                this.props.app.setStatus('Loaded', 3000)
                this.props.app.setState({isLoading:false});
        });

        }
    }

    public render() {
        return <NewsletterGroup key="pastNewsletters" app={this.props.app} newsletters={this.state.newsletters}/>
    }

    public componentDidUpdate(previousProps : any)
    {
        if (this.props.volume !== previousProps.volume) {
            console.log("Volume changed ("+previousProps.volume+"->"+this.props.volume+")")
            this.requery();
        }
    }
}
