/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */

import {
  Component, ChangeDetectionStrategy, Input, HostBinding,
  ComponentRef, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, ComponentFactoryResolver, ViewContainerRef,
  OnDestroy, OnInit,
} from '@angular/core';

import { NbSearchService } from './search.service';
import { NbThemeService } from '../../services/theme.service';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/filter';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/delay';
import { Router, NavigationEnd } from '@angular/router';

/**
 * search-field-component is used under the hood by nb-search component
 * can't be used itself
 */
@Component({
  selector: 'nb-search-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: [
    'styles/search.component.modal-zoomin.scss',
    'styles/search.component.layout-rotate.scss',
    'styles/search.component.modal-move.scss',
    'styles/search.component.curtain.scss',
    'styles/search.component.column-curtain.scss',
    'styles/search.component.modal-drop.scss',
    'styles/search.component.modal-half.scss',
  ],
  template: `
    <div class="search" (keyup.esc)="closeSearch()" >
      <button (click)="closeSearch()">
        <i class="nb-close-circled"></i>
      </button>
      <div class="form-wrapper">
        <form class="form" (keyup.enter)="submitSearch(searchInput.value)">
          <div class="form-content">
            <input class="search-input"
              #searchInput
              autocomplete="off"
              [attr.placeholder]="placeholder"
              tabindex="-1"
              (blur)="tabOut.next($event)"/>
          </div>
          <span class="info">Hit enter to search</span>
        </form>
      </div>
    </div>
  `,
})
export class NbSearchFieldComponent {

  static readonly TYPE_MODAL_ZOOMIN = 'modal-zoomin';
  static readonly TYPE_ROTATE_LAYOUT = 'rotate-layout';
  static readonly TYPE_MODAL_MOVE = 'modal-move';
  static readonly TYPE_CURTAIN = 'curtain';
  static readonly TYPE_COLUMN_CURTAIN = 'column-curtain';
  static readonly TYPE_MODAL_DROP = 'modal-drop';
  static readonly TYPE_MODAL_HALF = 'modal-half';

  @Input() searchType: string;
  @Input() placeholder: string;

  @Output() searchClose = new EventEmitter();
  @Output() search = new EventEmitter();
  @Output() tabOut = new EventEmitter();


  @ViewChild('searchInput') inputElement: ElementRef;

  @Input() @HostBinding('class.show') showSearch: boolean = false;

  @HostBinding('class.modal-zoomin')
  get modalZoomin() {
    return this.searchType === NbSearchFieldComponent.TYPE_MODAL_ZOOMIN;
  }

  @HostBinding('class.rotate-layout')
  get rotateLayout() {
    return this.searchType === NbSearchFieldComponent.TYPE_ROTATE_LAYOUT;
  }

  @HostBinding('class.modal-move')
  get modalMove() {
    return this.searchType === NbSearchFieldComponent.TYPE_MODAL_MOVE;
  }

  @HostBinding('class.curtain')
  get curtain() {
    return this.searchType === NbSearchFieldComponent.TYPE_CURTAIN;
  }

  @HostBinding('class.column-curtain')
  get columnCurtain() {
    return this.searchType === NbSearchFieldComponent.TYPE_COLUMN_CURTAIN;
  }

  @HostBinding('class.modal-drop')
  get modalDrop() {
    return this.searchType === NbSearchFieldComponent.TYPE_MODAL_DROP;
  }

  @HostBinding('class.modal-half')
  get modalHalf() {
    return this.searchType === NbSearchFieldComponent.TYPE_MODAL_HALF;
  }

  @Input()
  set type(val: any) {
    this.searchType = val;
  }

  closeSearch() {
    this.searchClose.emit(true);
  }

  submitSearch(term) {
    if (term) {
      this.search.emit(term);
    }
  }
}

/**
 * Beautiful full-page search control.
 *
 * @styles
 *
 * search-btn-open-fg:
 * search-btn-close-fg:
 * search-bg:
 * search-bg-secondary:
 * search-text:
 * search-info:
 * search-dash:
 * search-placeholder:
 */
@Component({
  selector: 'nb-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['styles/search.component.scss'],
  template: `
    <button class="start-search" (click)="openSearch()">
      <i class="nb-search"></i>
    </button>
    <ng-template #attachedSearchContainer></ng-template>
  `,
})
export class NbSearchComponent implements OnInit, AfterViewInit, OnDestroy {

  /**
   * Tags a search with some ID, can be later used in the search service
   * to determine which search component triggered the action, if multiple searches exist on the page.
   *
   * @type {string}
   */
  @Input() tag: string;

  /**
   * Search input placeholder
   * @type {string}
   */
  @Input() placeholder: string = 'Search...';

  @HostBinding('class.show') showSearch: boolean = false;

  @ViewChild('attachedSearchContainer', { read: ViewContainerRef }) attachedSearchContainer: ViewContainerRef;

  private searchFieldComponentRef: ComponentRef<any> = null;
  private searchType: string = 'rotate-layout';
  private activateSearchSubscription: Subscription;
  private deactivateSearchSubscription: Subscription;
  private routerSubscription: Subscription;

  constructor(private searchService: NbSearchService,
    private themeService: NbThemeService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private router: Router) { }

  /**
   * Search design type, available types are
   * modal-zoomin, rotate-layout, modal-move, curtain, column-curtain, modal-drop, modal-half
   * @type {string}
   */
  @Input()
  set type(val: any) {
    this.searchType = val;
  }

  openSearch() {
    this.searchService.activateSearch(this.searchType, this.tag);
  }

  connectToSearchField(componentRef) {
    this.searchFieldComponentRef = componentRef;
    componentRef.instance.searchType = this.searchType;
    componentRef.instance.placeholder = this.placeholder;
    componentRef.instance.searchClose.subscribe(() => {
      this.searchService.deactivateSearch(this.searchType, this.tag);
    });

    componentRef.instance.search.subscribe(term => {
      this.searchService.submitSearch(term, this.tag);
      this.searchService.deactivateSearch(this.searchType, this.tag);
    });

    componentRef.instance.tabOut
      .subscribe(() => this.showSearch && this.searchFieldComponentRef.instance.inputElement.nativeElement.focus());

    componentRef.changeDetectorRef.detectChanges();
  }

  createAttachedSearch(component): Observable<any> {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
    const componentRef = this.attachedSearchContainer.createComponent(componentFactory);

    return Observable.of(componentRef);
  }

  ngOnInit() {
    this.routerSubscription = this.router.events
      .filter(event => event instanceof NavigationEnd)
      .subscribe(event => this.searchService.deactivateSearch(this.searchType, this.tag));
    this.activateSearchSubscription = this.searchService.onSearchActivate().subscribe((data) => {
      if (!this.tag || data.tag === this.tag) {
        this.showSearch = true;
        this.themeService.appendLayoutClass(this.searchType);
        Observable.of(null).delay(0).subscribe(() => {
          this.themeService.appendLayoutClass('with-search');
        });
        this.searchFieldComponentRef.instance.showSearch = true;
        this.searchFieldComponentRef.instance.inputElement.nativeElement.focus();
        this.searchFieldComponentRef.changeDetectorRef.detectChanges();
      }
    });

    this.deactivateSearchSubscription = this.searchService.onSearchDeactivate().subscribe((data) => {
      if (!this.tag || data.tag === this.tag) {
        this.showSearch = false;
        this.searchFieldComponentRef.instance.showSearch = false;
        this.searchFieldComponentRef.instance.inputElement.nativeElement.value = '';
        this.searchFieldComponentRef.instance.inputElement.nativeElement.blur();
        this.searchFieldComponentRef.changeDetectorRef.detectChanges();
        this.themeService.removeLayoutClass('with-search');
        Observable.of(null).delay(500).subscribe(() => {
          this.themeService.removeLayoutClass(this.searchType);
        });
      }
    });
  }

  ngAfterViewInit() {
    this.themeService.appendToLayoutTop(NbSearchFieldComponent)
      .subscribe((componentRef: ComponentRef<any>) => {
        this.connectToSearchField(componentRef);
      });
  }

  ngOnDestroy() {
    this.activateSearchSubscription.unsubscribe();
    this.deactivateSearchSubscription.unsubscribe();
    this.routerSubscription.unsubscribe();
    if (this.searchFieldComponentRef) {
      this.searchFieldComponentRef.destroy();
    }
  }
}
