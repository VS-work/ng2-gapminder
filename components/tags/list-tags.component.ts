import {Component, Input} from '@angular/core';
import {RouterLink} from '@angular/router-deprecated';
import {Angulartics2On} from 'angulartics2/index';
import {ContentfulTagPage} from '../contentfulService/aliases.structures';

@Component({
  selector: 'gm-tags',
  template: require('./list-tags.html') as string,
  directives: [RouterLink, Angulartics2On],
  styles: [require('./tags.css') as string]
})
export class TagsComponent {
  /* tslint:disable:no-unused-variable */
  @Input() private tagList: ContentfulTagPage[] = [];
  /* tslint:enable:no-unused-variable */

}

