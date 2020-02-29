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

class NewsletterVolumeSelector extends Component<{
        volumes: number[],
        selectedVolume: number,
        visibleCount: number
        onVolumeSelected: (volume: number) => void
    }, {
        lastIndex: number,
        firstIndex: number,
    }> {

    constructor(props: any) {
        super(props)
        this.state = {lastIndex: this.initialLastIndex(), firstIndex: this.initialFirstIndex()}
        this.initialLastIndex = this.initialLastIndex.bind(this)
        this.initialFirstIndex = this.initialFirstIndex.bind(this)
        this.onNewerClick = this.onNewerClick.bind(this)
        this.onOlderClick = this.onOlderClick.bind(this)
    }

    public componentDidUpdate(previousProps : any)
    {
        if ((this.props.volumes.length !== previousProps.volumes.length) &&
            (this.props.volumes.length > 0))
        {
            this.setState({lastIndex: this.initialLastIndex(), firstIndex: this.initialFirstIndex()})
        }
    }

    public render() {
        const volumesToShow : number[] = this.props.volumes.slice(this.state.firstIndex, this.state.lastIndex+1);
        return <div>
                    <div className="newsletter-volume-list-more">
                    { (this.state.firstIndex>0) && (
                            <a href="#" onClick={this.onOlderClick}>
                                <i className="fa fa-2x fa-angle-left"/>
                            </a>
                         )
                     }
                    </div>
                    <ul key="volumeList" className="newsletter-volume-list">
                    {volumesToShow.map(
                        (volume:number) =>
                        <li key={"volume"+volume} className="newsletter-volume-list-item">
                            <NewsletterVolumeLink volume={volume} onClick={this.props.onVolumeSelected} selected={volume===this.props.selectedVolume}/>
                        </li>
                        )
                    }
                    </ul>
                    <div className="newsletter-volume-list-more">
                    { (this.state.lastIndex < this.props.volumes.length-1) && (
                            <a href="#" onClick={this.onNewerClick}>
                                <i className="fa fa-2x fa-angle-right"/>
                            </a>
                         )
                     }
                    </div>
                </div>
    }

    private initialLastIndex() : number {
        return (this.props.volumes.length>0) ? this.props.volumes.length-1 : 0
    }

    private initialFirstIndex() : number {
        return Math.max(this.initialLastIndex() - this.props.visibleCount, 0)
    }

    private onOlderClick() {
        const newLast : number = Math.max(this.state.lastIndex-1, 0)
        const newFirst : number = Math.max(newLast - this.props.visibleCount, 0)
        this.setState({firstIndex: newFirst, lastIndex: newLast})
    }

    private onNewerClick() {
        const newLast : number = Math.min(this.state.lastIndex+1, this.props.volumes.length-1)
        const newFirst : number = Math.max(newLast - this.props.visibleCount, 0)
        this.setState({firstIndex: newFirst, lastIndex: newLast})
    }
}

class NewsletterVolumeLink extends Component<{
    volume: number,
    selected: boolean
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
        let className :string = "newsletter-volume-list-link"
        if (this.props.selected) {
            className +=" newsletter-volume-list-link-selected"
        }
        return <a href="#" onClick={this.onVolumeClick} className={className}>{this.props.volume}</a>
    }
}

export class NewsletterDashboard extends Component<{
    app: App
  },{
    newsletters: INewsletter[],
    current: INewsletter,
    volume: number,
    volumes: number[]
  }> {
    constructor(props: any){
        super(props)
        this.state = {
            newsletters: [],
            current: {id:0} as INewsletter,
            volume: 0,
            volumes: []
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
                this.setState({current:data[0]})
            }
            else
            {
                this.setState({current:{id:-1} as INewsletter})
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
                <NewsletterVolumeSelector key="volumeList" selectedVolume={this.state.volume} onVolumeSelected={this.setVolume} volumes={this.state.volumes} visibleCount={6} />
            ]
        }
}
