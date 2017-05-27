import React, {Component} from 'react';

import { Text, View, ScrollView } from 'react-native';
import ActionSheet from 'react-native-actionsheet';
import Modal from 'react-modal';


class ActionSheetPatched extends ActionSheet {
  //react-native-web doesn't have Modal yet, so override render to use 'react-modal'

  render() {
    const { visible } = this.state

    return (
      <Modal
        isOpen={visible}
        transparent={true}
        animationType="bottom"
        onRequestClose={this._cancel}
        contentLabel="Modal"
      >
        <View>
          <Text onPress={this._cancel}></Text>
            {this._renderTitle()}
            <ScrollView
              scrollEnabled={this.scrollEnabled}>
              {this._renderOptions()}
            </ScrollView>
            {this._renderCancelButton()}
        </View>
      </Modal>
    )
  }
}

export default class MyActionSheet extends Component {
  state = {
    options: []
  }

  showActionSheetWithOptions(options) {
    this.setState({
      options
    }, () => {
      this.ActionSheet && this.ActionSheet.show();
    })
  }

  handlePress = (i) => {
    console.log('pressed index=', i)
    //this.ActionSheet && this.ActionSheet.hide();
  }

  render() {
    const { options: { options = [], cancelButtonIndex=10 }  = {} } = this.state;
    const { children } = this.props;
    return (
      <View>
        {children && children}
        <ActionSheetPatched
          ref={o => this.ActionSheet = o}
          title={'Please choose an option'}
          options={options}
          cancelButtonIndex={cancelButtonIndex}
          destructiveButtonIndex={10}
          onPress={this.handlePress}
        />
      </View>
    )
  }
}
