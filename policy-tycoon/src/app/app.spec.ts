import { App } from './app';

describe('App - Zoneless', () => {
  let component: App;

  beforeEach(() => {
    // Create component directly for zoneless mode
    component = new App();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have title property', () => {
    // Access title through component instance (title is protected)
    expect((component as any).title).toBe('Policy Tycoon');
  });
});
