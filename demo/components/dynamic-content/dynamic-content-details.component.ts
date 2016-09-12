import { Component, OnInit, Inject } from '@angular/core';
import { Router, ActivatedRoute, UrlPathWithParams, ROUTER_DIRECTIVES } from '@angular/router';
import { ToDatePipe } from '../../../components/pipes/to-date.pipe';
import { NodePageContent } from '../../../components/contentful/content-type.structures';
import {
  ContentfulNodePage,
  ContentfulTagPage,
  ContentfulProfilePage
} from '../../../components/contentful/aliases.structures';
import { ContenfulContent } from '../../../components/contentful/contentful-content.service';
import { BreadcrumbsService } from '../../../components/breadcrumbs/breadcrumbs.service';
import { EntriesViewComponent } from '../../../components/entries-view/entries-view.component';
import { TagsComponent } from '../../../components/tags/tags.component';
import { ContributorsComponent } from '../../../components/contributors/contributors.component';
import { RoutesManagerService } from '../../../components/routes-gateway/routes-manager.service';
import { RelatedComponent } from '../../../components/related/related.component';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Rx';

@Component({
  selector: 'gm-dynamic-page',
  template: require('./dynamic-content-details.component.html') as string,
  directives: [EntriesViewComponent, RelatedComponent, ROUTER_DIRECTIVES, TagsComponent, ContributorsComponent],
  styles: [require('./dynamic-content-details.component.styl') as string],
  pipes: [ToDatePipe]
})
export class DynamicContentDetailsComponent implements OnInit {
  private content: NodePageContent;
  private children: ContentfulNodePage[];
  private urlPath: string;
  private contentSlug: string;
  private router: Router;
  private activatedRoute: ActivatedRoute;
  private contentfulContentService: ContenfulContent;
  private routesManager: RoutesManagerService;
  private breadcrumbsService: BreadcrumbsService;
  private constants: any;
  private profiles: ContentfulProfilePage[];
  private cssClassBigColumn: boolean = false;
  private cssClassSmallColumn: boolean = false;
  private projectTagId: string;
  private relatedArticles: ContentfulNodePage[];

  public constructor(router: Router,
                     activatedRoute: ActivatedRoute,
                     routesManager: RoutesManagerService,
                     @Inject('Constants') constants: any,
                     contentfulContentService: ContenfulContent,
                     breadcrumbsService: BreadcrumbsService) {
    this.router = router;
    this.contentfulContentService = contentfulContentService;
    this.breadcrumbsService = breadcrumbsService;
    this.routesManager = routesManager;
    this.activatedRoute = activatedRoute;
    this.constants = constants;
  }

  public ngOnInit(): void {
    this.activatedRoute.url
      .subscribe((urls: UrlPathWithParams[]) => {
        this.urlPath = urls.map((value: UrlPathWithParams) => value.path).join('/');
        this.contentSlug = this.urlPath.split('/').pop();

        this.contentfulContentService
          .getTagsBySlug(this.constants.PROJECT_TAG)
          .mergeMap((tags: ContentfulTagPage[]) => Observable.from(tags))
          .do((projectTagId: ContentfulTagPage) => this.projectTagId = projectTagId.sys.id)
          .map((tag: ContentfulTagPage) => tag.sys.id)
          .mergeMap((tagSysId: string) => this.contentfulContentService.getArticleByTagAndSlug(tagSysId, this.contentSlug))
          .mergeMap((articles: ContentfulNodePage[]) => Observable.from(articles))
          .subscribe((article: ContentfulNodePage) => this.onArticleReceived(article));
      });
  }

  private related(related: ContentfulNodePage[]): Observable<ContentfulNodePage[]> {
    return Observable
      .from(related)
      .filter((article: ContentfulNodePage) => !!_.find(article.fields.tags, (tag: ContentfulTagPage) => tag.sys.id === this.projectTagId))
      .toArray();
  }

  private onArticleReceived(article: ContentfulNodePage): void {
    if (!article) {
      this.router.navigate(['/']);
    }
    this.content = article.fields;
    if (this.content.related) {

      this.related(this.content.related).subscribe((related: ContentfulNodePage[]) => {
        if (!_.isEmpty(related)) {
          this.relatedArticles = related;
        }
      });
    }

    this.breadcrumbsService.breadcrumbs$.next({url: this.urlPath, name: this.content.title});
    this.contentfulContentService.getProfilesByArticleIdAndProjectTag(article.sys.id, this.constants.PROJECT_TAG)
      .subscribe((profiles: ContentfulProfilePage[]) => {
        this.profiles = profiles;
        this.cssClassSmallColumn = this.relatedSectionIsAtRight() || !_.isEmpty(profiles);
        // TODO: remove this css class
        this.cssClassBigColumn = !this.cssClassSmallColumn;
      });

    this.contentfulContentService.getChildrenOfArticleByTag(article.sys.id, this.constants.PROJECT_TAG)
      .subscribe((children: ContentfulNodePage[]) => {
        _.forEach(children, (child: ContentfulNodePage) => {
          const currentPagePath: string = _.map(this.activatedRoute.snapshot.url, 'path').join('/');
          child.fields.url = `${currentPagePath}/${child.fields.slug}`;
        });
        this.routesManager.addRoutesFromArticles(... children);
        this.children = children;
      });
  }

  private relatedSectionIsAtRight(): boolean {
    return Boolean(this.rightRelatedLocation() && this.content.related);
  }

  private rightRelatedLocation(): boolean {
    return !Boolean(this.content.relatedLocation);
  }
}

