import { Component } from 'react'
import './index.css'
import { ConfigService } from './Services/ConfigService';
import { MembersService } from './Services/MembersService'

export class SilentLogin extends Component<{
    onLoaded: () => void
}, {
    isConfigLoaded: boolean 
}> {
    constructor(props: any) {
        super(props)
        this.state = {
            isConfigLoaded: false
        }
    }

    public render() {
        // practically hidden 1px by 1px iframe
        return !this.state.isConfigLoaded ? <div></div> : 
            <iframe src={ConfigService.Config.loginUrl} 
                width='1px' height='1px' scrolling='no'>
            </iframe>
    }

    public componentDidMount() {
        ConfigService.getConfig().then(() => {
            this.setState({isConfigLoaded: true})
            setTimeout(() => {
                MembersService.getMembers(true).then(() => {
                    this.props.onLoaded()
                })
            }, 2000)
        })
    }
}
