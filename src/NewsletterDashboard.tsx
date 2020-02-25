import * as React from 'react';
import { Component } from 'react';
import { Spinner } from '.';
import { App } from './App';
import { BaseUrl } from '.';
import { INewsletter } from './Interfaces';
import './index.css';
import './print.css';
import { TriphubNavbar } from './TriphubNavBar';
import { NewsletterList } from './NewsletterList';
import { NewsletterGroup } from './NewsletterGroup';
import { Button } from 'reactstrap';

class NewsletterVolumeLink extends Component<{
    volume: number
    onClick: (volume: number) => void
    }, {}> {
    constructor(props: any)
    {
        super(props)
        this.onVolumeClick = this.onVolumeClick.bind(this)
    }

    public onVolumeClick() {
        this.props.onClick(this.props.volume)
    }

    public render() {
        return <a href="#" onClick={this.onVolumeClick}>{this.props.volume}</a>
    }
}

export class NewsletterDashboard extends Component<{
    app: App
  },{
    newsletters: INewsletter[],
    current: INewsletter,
    volumes: number[],
    volume: number
  }> {
    constructor(props: any){
        super(props)
        this.state = {
            newsletters: [],
            current: {id:0} as INewsletter,
            volumes: [],
            volume: 0
        }
        this.requery = this.requery.bind(this)
        this.newNewsletter = this.newNewsletter.bind(this)
        this.setVolume = this.setVolume.bind(this)
    }

    public requery() {
        this.props.app.setStatus(['Loading ', Spinner]);
        // PENDING - some way of doing pagination, or by year or something
        this.props.app.apiCall('GET',BaseUrl + '/newsletters/volumes')
        .then( (data : number[]) => {
            const latestVolume = data[data.length-1]
            console.log("Latest volume"+latestVolume)
            this.setState({volumes: data, volume: latestVolume})
            this.props.app.setStatus('Loaded', 3000)
            this.props.app.setState({isLoading:false});
        })
    }

    public componentDidMount(){
        this.props.app.apiCall('GET', BaseUrl+'/newsletters/current')
        .then((data:INewsletter[]) => {
            if (data.length > 0)
            {
                this.setState({current:data[0]});
            }
            else
            {
                this.setState({current:{id:-1} as INewsletter});
            }
        });
        this.requery()
    }

    public newNewsletter() {
        this.props.app.setPath("/newnewsletter")
    }

    public setVolume(newVolume:number)
    {
        this.setState({volume:newVolume})
    }


    public render(){
        
        let currentNewsletter : any;
        if (this.state.current.id === 0)
        {
            currentNewsletter = <span>Loading...</span>
        } else if (this.state.current.id === -1)
        {
            currentNewsletter = <span>No current newsletter!<Button onClick={this.newNewsletter}>Create</Button></span>

        } else 
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
                <NewsletterList key="pastNewsletters" app={this.props.app} volume={this.state.volume}/>,
                <ul key="volumeList">
                    {this.state.volumes.map(
                        (volume:number) =>
                        <li key={"volume"+volume}>
                            <NewsletterVolumeLink volume={volume} onClick={this.setVolume}/>
                        </li>
                        )
                    }
                </ul>
            ]
        }
}
